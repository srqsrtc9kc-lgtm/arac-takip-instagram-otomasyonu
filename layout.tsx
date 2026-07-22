import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { agentLog } from '@/lib/log';

export const dynamic = 'force-dynamic';

// Düzenlenebilir alan beyaz listesi — istemciden gelen başka hiçbir
// alan (örn. status, id) doğrudan yazılamaz.
const EDITABLE_FIELDS = [
  'visual_text',
  'visual_subtext',
  'caption',
  'cta',
  'hashtags',
  'story_texts',
  'carousel_slides',
  'reels_script',
  'reels_scenes',
] as const;

/**
 * PATCH /api/drafts/[id]
 * body: { action: 'approve' | 'reject' | 'update', fields?: {...} }
 *
 * Kurallar:
 * - Paylaşılmış (published) içerik hiçbir şekilde değiştirilemez.
 * - "update" sonrası durum her zaman 'draft'a döner: onay, kullanıcının
 *   ön izlemede GÖRDÜĞÜ içeriğe aittir; içerik değişirse yeniden onay gerekir.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: draftId } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body.action !== 'string') {
      return NextResponse.json({ error: 'Geçersiz istek gövdesi' }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: draft, error } = await db
      .from('content_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error || !draft) {
      return NextResponse.json({ error: 'Taslak bulunamadı' }, { status: 404 });
    }
    if (draft.status === 'published') {
      return NextResponse.json(
        { error: 'Paylaşılmış içerik değiştirilemez' },
        { status: 409 }
      );
    }

    const { data: publishClaim, error: claimError } = await db
      .from('published_posts')
      .select('status')
      .eq('draft_id', draftId)
      .maybeSingle();
    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 500 });
    }

    const now = new Date().toISOString();

    // ── ONAYLA ──
    if (body.action === 'approve') {
      if (publishClaim && publishClaim.status !== 'partial') {
        return NextResponse.json(
          {
            error:
              'Bu taslak için önceki yayın kaydı var. Çift paylaşımı önlemek için yeniden onay kapalıdır.',
          },
          { status: 409 }
        );
      }
      if (draft.content_type === 'reels' && !draft.video_url) {
        return NextResponse.json({ error: 'Onaydan önce Reels videosunu oluşturun.' }, { status: 400 });
      }
      if (draft.content_type === 'carousel' && (draft.media_urls?.length ?? 0) < 2) {
        return NextResponse.json({ error: 'Onaydan önce carousel karelerini oluşturun.' }, { status: 400 });
      }
      if (
        draft.content_type !== 'reels' &&
        draft.content_type !== 'carousel' &&
        !draft.image_url
      ) {
        return NextResponse.json({ error: 'Onaydan önce paylaşım görselini oluşturun.' }, { status: 400 });
      }
      const { error: upErr } = await db
        .from('content_drafts')
        .update({ status: 'approved', updated_at: now })
        .eq('id', draftId);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

      await agentLog(db, 'draft_approved', 'Kullanıcı taslağı ön izleme sonrası onayladı', {
        draftId,
      });
      return NextResponse.json({ ok: true, status: 'approved' });
    }

    // ── REDDET ──
    if (body.action === 'reject') {
      if (publishClaim?.status === 'publishing') {
        return NextResponse.json(
          { error: 'Yayın isteği devam ederken taslak kapatılamaz.' },
          { status: 409 }
        );
      }
      if (
        publishClaim &&
        !['partial', 'uncertain', 'failed'].includes(String(publishClaim.status))
      ) {
        return NextResponse.json(
          { error: 'Bu yayın kaydı kapatılamaz; Instagram durumunu kontrol edin.' },
          { status: 409 }
        );
      }
      if (publishClaim) {
        const { error: abandonError } = await db
          .from('published_posts')
          .update({ status: 'abandoned' })
          .eq('draft_id', draftId);
        if (abandonError) {
          return NextResponse.json({ error: abandonError.message }, { status: 500 });
        }
      }
      const { error: upErr } = await db
        .from('content_drafts')
        .update({ status: 'rejected', updated_at: now })
        .eq('id', draftId);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

      await agentLog(db, 'draft_rejected', 'Kullanıcı taslağı reddetti', {
        draftId,
      });
      return NextResponse.json({ ok: true, status: 'rejected' });
    }

    // ── DÜZENLE ──
    if (body.action === 'update') {
      if (publishClaim) {
        return NextResponse.json(
          {
            error:
              'Yayın akışı başlamış bir taslağın metni değiştirilemez. Kalan yayını tamamlayın veya taslağı kapatın.',
          },
          { status: 409 }
        );
      }
      const fields = (body.fields ?? {}) as Record<string, unknown>;
      const update: Record<string, unknown> = {};

      for (const key of EDITABLE_FIELDS) {
        if (!(key in fields)) continue;
        const value = fields[key];
        // Dizi alanlar için basit doğrulama
        if (
          (key === 'hashtags' ||
            key === 'story_texts' ||
            key === 'carousel_slides' ||
            key === 'reels_scenes') &&
          value !== null &&
          !Array.isArray(value)
        ) {
          continue;
        }
        update[key] = value;
      }

      if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: 'Güncellenecek geçerli alan yok' }, { status: 400 });
      }

      // Kritik: düzenlenen içerik yeniden onay bekler.
      update.status = 'draft';
      update.updated_at = now;
      // Kritik: metin değişti → mevcut görsel eskidi. Sıfırlanır ki
      // içerikle uyuşmayan bir görsel asla paylaşılamasın (Adım 7).
      update.image_url = null;
      update.media_urls = null;
      update.video_url = null;
      update.media_generated_at = null;

      const { error: upErr } = await db
        .from('content_drafts')
        .update(update)
        .eq('id', draftId);
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

      await agentLog(db, 'draft_updated', 'Taslak düzenlendi; onay durumu ve görsel sıfırlandı', {
        draftId,
        updatedFields: Object.keys(update).filter(
          (k) =>
            !['status', 'updated_at', 'image_url', 'media_urls', 'video_url', 'media_generated_at'].includes(k)
        ),
      });
      return NextResponse.json({ ok: true, status: 'draft' });
    }

    return NextResponse.json({ error: 'Bilinmeyen aksiyon' }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
