import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { agentLog } from '@/lib/log';
import { renderDraftImage } from '@/lib/image/render';
import type { ContentDraft } from '@/lib/types';

export const dynamic = 'force-dynamic';

const BUCKET = 'content-images';

/**
 * POST /api/image — Adım 7
 * body: { draftId }
 *
 * Taslak metinlerinden marka görselini üretir, Supabase Storage'a
 * yükler (public bucket) ve public URL'i taslağa yazar.
 * Bu URL, Adım 8'de Meta Graph API'nin istediği görsel adresidir.
 *
 * Kurallar:
 * - Paylaşılmış (published) taslağın görseli değiştirilemez.
 * - Görsel üretmek onay durumunu DEĞİŞTİRMEZ: görsel, onaylanan
 *   metinlerin sabit şablonla birebir dizgisidir ve kullanıcı
 *   paylaşmadan önce ön izlemede görselin kendisini görür.
 * - Taslak düzenlenirse image_url otomatik sıfırlanır (bkz.
 *   /api/drafts/[id]) → eski görsel asla paylaşılamaz.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const draftId = body?.draftId;
    if (!draftId || typeof draftId !== 'string') {
      return NextResponse.json({ error: 'draftId gerekli' }, { status: 400 });
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
        { error: 'Paylaşılmış içeriğin görseli değiştirilemez' },
        { status: 409 }
      );
    }

    // 1) PNG üret
    const png = await renderDraftImage(draft as ContentDraft);

    // 2) Storage'a yükle
    // BENZERSİZ dosya adı: her üretimde farklı yol kullanılır. Böylece
    // tarayıcı veya CDN önbelleği ESKİ görseli gösteremez — "Görseli Yenile"
    // her zaman yeni görseli getirir. Eski dosya aşağıda silinir.
    const previousUrl: string | null = draft.image_url ?? null;
    const filePath = `drafts/${draftId}-${Date.now()}.png`;
    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(filePath, png, { contentType: 'image/png', upsert: true });

    if (upErr) {
      const msg = upErr.message || '';
      const bucketMissing = /bucket/i.test(msg) && /(not.*found|does not exist)/i.test(msg);
      return NextResponse.json(
        {
          error: bucketMissing
            ? `"${BUCKET}" bucket'ı bulunamadı. Supabase SQL Editor'de supabase/migration-adim7.sql dosyasını bir kez çalıştırın.`
            : 'Görsel yüklenemedi: ' + msg,
        },
        { status: 500 }
      );
    }

    // 3) Public URL (dosya adı zaten benzersiz olduğu için ?v= gerekmez)
    const { data: pub } = db.storage.from(BUCKET).getPublicUrl(filePath);
    const imageUrl = pub.publicUrl;

    const { error: updErr } = await db
      .from('content_drafts')
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', draftId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    await agentLog(db, 'image_generated', 'Taslak görseli üretildi ve yüklendi', {
      draftId,
      contentType: draft.content_type,
    });

    // 4) Eski görseli Storage'dan sil (çöp birikmesin). Başarısız olursa
    //    akış bozulmaz; yeni görsel zaten kaydedildi.
    if (previousUrl) {
      const marker = `/${BUCKET}/`;
      const i = previousUrl.indexOf(marker);
      if (i !== -1) {
        const oldPath = previousUrl.slice(i + marker.length).split('?')[0];
        if (oldPath && oldPath !== filePath) {
          await db.storage.from(BUCKET).remove([oldPath]).catch(() => undefined);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      imageUrl,
      message: 'Görsel oluşturuldu. Ön izlemede gerçek görsel gösteriliyor.',
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
