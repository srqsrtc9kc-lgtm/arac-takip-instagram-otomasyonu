import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { agentLog } from '@/lib/log';
import { isMetaConfigured, publishToInstagram } from '@/lib/publish/meta';
import { isPlaywrightEnabled, publishViaPlaywright } from '@/lib/publish/playwright';

export const dynamic = 'force-dynamic';
// Container işleme beklemesi için süre payı (Vercel'de fonksiyon süresi).
export const maxDuration = 60;

// Yarım kalmış bir paylaşım kilidi bu süreden eskiyse geçersiz sayılır.
const STALE_CLAIM_MS = 3 * 60 * 1000;

/**
 * POST /api/publish  —  body: { draftId: string }
 *
 * ════════════════════════════════════════════════════════════════
 * KRİTİK KURAL (Bölüm J):
 * Paylaşım, yalnızca kullanıcı ön izlemeyi görüp AÇIKÇA onay
 * verdikten sonra yapılır. Frontend butonuna güvenilmez — bu
 * endpoint, taslağın durumu 'approved' değilse paylaşımı REDDEDER.
 * ════════════════════════════════════════════════════════════════
 *
 * Çift paylaşım engeli (üç katman):
 * 1) published_posts.draft_id UNIQUE (veritabanı, mutlak).
 * 2) Meta'ya gitmeden önce 'publishing' durumunda kilit kaydı atılır;
 *    eşzamanlı ikinci istek kilide takılır ve Meta'ya hiç ulaşmaz.
 * 3) Başarısız denemede kilit silinir → elle "Tekrar Dene" mümkün.
 *    Otomatik tekrar deneme YAPILMAZ.
 */
export async function POST(req: Request) {
  const db = supabaseAdmin();
  let claimedDraftId: string | null = null;

  try {
    const body = await req.json().catch(() => null);
    const draftId = typeof body?.draftId === 'string' ? body.draftId : undefined;
    if (!draftId) {
      return NextResponse.json({ error: 'draftId gerekli' }, { status: 400 });
    }

    const { data: draft, error } = await db
      .from('content_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error || !draft) {
      return NextResponse.json({ error: 'Taslak bulunamadı' }, { status: 404 });
    }

    // ── 1) BACKEND ONAY KONTROLÜ (kritik kural) ──
    if (draft.status !== 'approved') {
      await agentLog(
        db,
        'publish_blocked',
        `Onaysız paylaşım denemesi engellendi (mevcut durum: ${draft.status})`,
        { draftId }
      );
      return NextResponse.json(
        { error: 'Bu içerik onaylanmamış. Paylaşım yalnızca onaylı içerikler için yapılır.' },
        { status: 403 }
      );
    }

    // ── 2) İÇERİK ÖN KOŞULLARI ──
    if (draft.content_type === 'reels') {
      await agentLog(db, 'publish_blocked', 'Reels API üzerinden görsel olarak paylaşılamaz', {
        draftId,
      });
      return NextResponse.json(
        {
          error:
            'Reels, görsel paylaşım API akışıyla yayınlanamaz (video gerekir). Videoyu sahne planına göre çekip Instagram uygulamasından paylaşın.',
        },
        { status: 400 }
      );
    }
    if (!draft.image_url) {
      return NextResponse.json(
        { error: 'Bu taslağın görseli yok. Önce "Görseli Oluştur" ile paylaşım görselini üretin.' },
        { status: 400 }
      );
    }

    // ── 3) ÇİFT PAYLAŞIM ENGELİ ──
    const { data: existing } = await db
      .from('published_posts')
      .select('id, status, published_at')
      .eq('draft_id', draftId)
      .maybeSingle();

    if (existing) {
      const age = Date.now() - new Date(existing.published_at as string).getTime();
      if (existing.status === 'publishing' && age > STALE_CLAIM_MS) {
        // Yarım kalmış eski deneme (ör. sunucu kesintisi) — kilidi temizle, devam et.
        await db.from('published_posts').delete().eq('id', existing.id);
        await agentLog(db, 'publish_claim_reset', 'Eski yarım kalmış paylaşım kilidi temizlendi', {
          draftId,
        });
      } else if (existing.status === 'publishing') {
        return NextResponse.json(
          { error: 'Bu içerik için paylaşım şu anda devam ediyor. Lütfen bekleyin.' },
          { status: 409 }
        );
      } else {
        await agentLog(db, 'publish_duplicate_blocked', 'Aynı içerik ikinci kez paylaşılmak istendi', {
          draftId,
        });
        return NextResponse.json({ error: 'Bu içerik zaten paylaşılmış.' }, { status: 409 });
      }
    }

    // ── 4) PAYLAŞIM MODU SEÇİMİ ──
    // Öncelik her zaman Meta Graph API (Mod 1). Meta yoksa ve Playwright
    // fallback (Mod 2) BİLİNÇLİ olarak açıksa o denenir. İkisi de yoksa
    // içerik onaylı olarak bekletilir (paylaşım yapılmaz).
    const metaReady = isMetaConfigured();
    const playwrightReady = isPlaywrightEnabled();
    const mode: 'api' | 'playwright' | null = metaReady
      ? 'api'
      : playwrightReady
        ? 'playwright'
        : null;

    if (mode === null) {
      const playwrightConfigured = Boolean(
        process.env.INSTAGRAM_USERNAME && process.env.INSTAGRAM_PASSWORD
      );
      await agentLog(db, 'publish_pending', 'Onay alındı; aktif paylaşım modu yok', {
        draftId,
        playwrightConfigured,
      });
      return NextResponse.json({
        ok: false,
        pending: true,
        message: playwrightConfigured
          ? 'Meta API bilgileri eksik. Playwright fallback bilgileri var ama kapalı; açmak için .env.local\'e ENABLE_PLAYWRIGHT_FALLBACK=true ekleyin (kullanım koşulu riskini okuyun). İçerik onaylı olarak bekliyor.'
          : 'Paylaşım modu yapılandırılmadı. .env.local dosyasında Meta API bilgilerini doldurun (Ayarlar sayfası durumu gösterir); içerik onaylı olarak bekliyor.',
      });
    }

    // ── 5) PAYLAŞIM KİLİDİ (claim) ──
    // Meta'ya/Instagram'a gitmeden ÖNCE atılır: eşzamanlı ikinci istek
    // UNIQUE kısıtına takılır ve Instagram'a asla ikinci istek gitmez.
    const { error: claimErr } = await db.from('published_posts').insert({
      draft_id: draftId,
      content_type: draft.content_type,
      caption: draft.caption,
      image_url: draft.image_url,
      publish_mode: mode,
      status: 'publishing',
    });
    if (claimErr) {
      if (claimErr.code === '23505') {
        return NextResponse.json(
          { error: 'Bu içerik için paylaşım zaten başlatılmış.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: claimErr.message }, { status: 500 });
    }
    claimedDraftId = draftId;

    // ── 6) PAYLAŞIM AKIŞI (seçilen moda göre) ──
    // Feed gönderilerinde hashtagler caption'ın sonuna eklenir.
    const hashtags = Array.isArray(draft.hashtags) ? draft.hashtags.join(' ') : '';
    const finalCaption =
      draft.content_type === 'story'
        ? null
        : [draft.caption, hashtags].filter(Boolean).join('\n\n') || null;

    let instagramPostId: string | null = null;

    if (mode === 'api') {
      const res = await publishToInstagram({
        imageUrl: draft.image_url,
        caption: finalCaption,
        contentType: draft.content_type as 'post' | 'demo' | 'story',
      });
      instagramPostId = res.instagramPostId;
    } else {
      // Mod 2 — Playwright fallback (kullanım koşulu riski; bkz. lib/publish/playwright.ts)
      await agentLog(db, 'publish_mode_playwright', 'Paylaşım Playwright fallback ile deneniyor', {
        draftId,
      });
      await publishViaPlaywright({
        imageUrl: draft.image_url,
        caption: finalCaption,
        db,
        draftId,
        // YAYIN ÖNCESİ YENİDEN ONAY (kritik kural — Mod 2 aynası):
        // Paylaş adımından hemen önce taslağın hâlâ 'approved' olduğunu
        // veritabanından teyit eder. Değilse paylaşım son anda iptal edilir.
        reconfirm: async () => {
          const { data: fresh } = await db
            .from('content_drafts')
            .select('status')
            .eq('id', draftId)
            .single();
          return fresh?.status === 'approved';
        },
      });
      // Playwright akışı gönderi kimliğini güvenilir döndüremeyebilir;
      // başarı durumunda kayıt kimliksiz tutulur.
    }

    // ── 7) KAYIT ──
    const now = new Date().toISOString();
    const { error: finalizeErr } = await db
      .from('published_posts')
      .update({ instagram_post_id: instagramPostId, status: 'published', published_at: now })
      .eq('draft_id', draftId);
    if (finalizeErr) {
      // Paylaşım Instagram'da GERÇEKLEŞTİ; kayıt güncellenemese bile
      // kilit satırı duruyor → çift paylaşım yine imkânsız. Sadece logla.
      await agentLog(db, 'publish_record_warning', 'Paylaşım yapıldı ancak kayıt güncellenemedi', {
        draftId,
        instagramPostId,
      });
    }

    await db
      .from('content_drafts')
      .update({ status: 'published', updated_at: now })
      .eq('id', draftId);

    await agentLog(db, 'publish_success', 'İçerik Instagram\'da yayınlandı', {
      draftId,
      instagramPostId,
      mode,
      contentType: draft.content_type,
    });

    return NextResponse.json({
      ok: true,
      instagramPostId,
      mode,
      message: 'Paylaşım tamamlandı — içerik Instagram\'da yayında.',
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Bilinmeyen hata';

    // Başarısız deneme: kilidi kaldır (elle tekrar denenebilsin),
    // taslağı 'failed' yap, logla. OTOMATİK TEKRAR DENEME YOK.
    if (claimedDraftId) {
      await db
        .from('published_posts')
        .delete()
        .eq('draft_id', claimedDraftId)
        .eq('status', 'publishing');
      await db
        .from('content_drafts')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', claimedDraftId);
      await agentLog(db, 'publish_failed', 'Paylaşım başarısız oldu', {
        draftId: claimedDraftId,
        reason: reason.slice(0, 300),
      });
      return NextResponse.json(
        {
          error:
            reason +
            ' — Otomatik tekrar denenmedi; sorunu giderdikten sonra "Paylaşımı Tekrar Dene" butonunu kullanabilirsiniz.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ error: reason }, { status: 500 });
  }
}
