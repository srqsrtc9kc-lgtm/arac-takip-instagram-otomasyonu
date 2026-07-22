import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { agentLog } from '@/lib/log';
import { renderDraftImage } from '@/lib/image/render';
import { renderReelVideo } from '@/lib/video/render';
import type { ContentDraft } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const IMAGE_BUCKET = 'content-images';
const VIDEO_BUCKET = 'content-videos';

type Db = ReturnType<typeof supabaseAdmin>;

function publicUrl(db: Db, bucket: string, filePath: string): string {
  return db.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
}

async function upload(
  db: Db,
  bucket: string,
  filePath: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const { error } = await db.storage
    .from(bucket)
    .upload(filePath, data, { contentType, upsert: false });
  if (error) {
    const missing = /bucket/i.test(error.message) && /(not.*found|does not exist)/i.test(error.message);
    throw new Error(
      missing
        ? `"${bucket}" bucket'ı eksik. Supabase SQL Editor'de supabase/migration-social-formats.sql dosyasını çalıştırın.`
        : `Medya yüklenemedi (${bucket}): ${error.message}`
    );
  }
  return publicUrl(db, bucket, filePath);
}

function storagePath(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return url.slice(index + marker.length).split('?')[0] || null;
}

async function removeUrls(db: Db, bucket: string, urls: Array<string | null | undefined>) {
  const paths = [...new Set(urls.filter(Boolean).map((url) => storagePath(url as string, bucket)).filter(Boolean))] as string[];
  if (paths.length > 0) await db.storage.from(bucket).remove(paths).catch(() => undefined);
}

function nonEmpty(items: unknown): string[] {
  return Array.isArray(items)
    ? items.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
}

/**
 * POST /api/image — bütün yayın medyasını hazırlar.
 * - post/demo: tek PNG
 * - carousel: 2–10 kare PNG
 * - story: 1–5 dikey PNG
 * - reels: sahnelerden otomatik 1080x1920 MP4 + kapak PNG
 *
 * Medya her yenilendiğinde taslak yeniden onay bekler. Böylece kullanıcı
 * onaylamadan önce yayınlanacak gerçek görseli/videoyu mutlaka görür.
 */
export async function POST(req: Request) {
  const db = supabaseAdmin();
  const createdImages: string[] = [];
  const createdVideos: string[] = [];

  try {
    const body = await req.json().catch(() => null);
    const draftId = body?.draftId;
    if (!draftId || typeof draftId !== 'string') {
      return NextResponse.json({ error: 'draftId gerekli' }, { status: 400 });
    }

    const { data, error } = await db
      .from('content_drafts')
      .select('*')
      .eq('id', draftId)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'Taslak bulunamadı' }, { status: 404 });
    }
    if (data.status === 'published') {
      return NextResponse.json(
        { error: 'Paylaşılmış içeriğin medyası değiştirilemez' },
        { status: 409 }
      );
    }

    const { data: publishClaim, error: claimError } = await db
      .from('published_posts')
      .select('status')
      .eq('draft_id', draftId)
      .maybeSingle();
    if (claimError) throw new Error('Yayın durumu okunamadı: ' + claimError.message);
    if (publishClaim) {
      return NextResponse.json(
        {
          error:
            'Bu taslak için yayın akışı daha önce başladı. Yarım veya belirsiz bir yayında medyayı değiştirmek güvenli değildir.',
        },
        { status: 409 }
      );
    }

    const draft = data as ContentDraft;
    const stamp = Date.now();
    let imageUrl: string | null = null;
    let mediaUrls: string[] = [];
    let videoUrl: string | null = null;

    if (draft.content_type === 'carousel') {
      const slides = nonEmpty(draft.carousel_slides).slice(0, 10);
      if (slides.length < 2) throw new Error('Carousel için en az iki kare metni gerekli.');

      for (let i = 0; i < slides.length; i++) {
        const png = await renderDraftImage(draft, {
          vertical: false,
          headline: slides[i],
          subtext: i === 0 ? draft.visual_subtext : null,
          cta: i === slides.length - 1 ? draft.cta : null,
          kicker: `KAYDIR ${i + 1}/${slides.length}`,
          seedSuffix: `carousel-${i}`,
        });
        const url = await upload(
          db,
          IMAGE_BUCKET,
          `drafts/${draftId}-${stamp}-carousel-${i + 1}.png`,
          png,
          'image/png'
        );
        createdImages.push(url);
        mediaUrls.push(url);
      }
      imageUrl = mediaUrls[0];
    } else if (draft.content_type === 'story') {
      const slides = nonEmpty(draft.story_texts).slice(0, 5);
      if (slides.length === 0) slides.push(draft.visual_text || 'Araç Takip Paneli');

      for (let i = 0; i < slides.length; i++) {
        const png = await renderDraftImage(draft, {
          vertical: true,
          headline: slides[i],
          subtext: null,
          cta: i === slides.length - 1 ? draft.cta : null,
          kicker: `STORY ${i + 1}/${slides.length}`,
          seedSuffix: `story-${i}`,
        });
        const url = await upload(
          db,
          IMAGE_BUCKET,
          `drafts/${draftId}-${stamp}-story-${i + 1}.png`,
          png,
          'image/png'
        );
        createdImages.push(url);
        mediaUrls.push(url);
      }
      imageUrl = mediaUrls[0];
    } else if (draft.content_type === 'reels') {
      const scenes = nonEmpty(draft.reels_scenes).slice(0, 8);
      if (scenes.length < 2) throw new Error('Reels için en az iki sahne metni gerekli.');

      const frames: Buffer[] = [];
      for (let i = 0; i < scenes.length; i++) {
        frames.push(
          await renderDraftImage(draft, {
            vertical: true,
            headline: scenes[i],
            subtext: null,
            cta: i === scenes.length - 1 ? draft.cta : null,
            kicker: `KISA VİDEO ${i + 1}/${scenes.length}`,
            seedSuffix: `reel-${i}`,
          })
        );
      }

      imageUrl = await upload(
        db,
        IMAGE_BUCKET,
        `drafts/${draftId}-${stamp}-reels-cover.png`,
        frames[0],
        'image/png'
      );
      createdImages.push(imageUrl);
      mediaUrls = [imageUrl];

      const mp4 = await renderReelVideo(frames);
      videoUrl = await upload(
        db,
        VIDEO_BUCKET,
        `reels/${draftId}-${stamp}.mp4`,
        mp4,
        'video/mp4'
      );
      createdVideos.push(videoUrl);
    } else {
      const png = await renderDraftImage(draft);
      imageUrl = await upload(
        db,
        IMAGE_BUCKET,
        `drafts/${draftId}-${stamp}.png`,
        png,
        'image/png'
      );
      createdImages.push(imageUrl);
      mediaUrls = [imageUrl];
    }

    const now = new Date().toISOString();
    const { error: updateError } = await db
      .from('content_drafts')
      .update({
        image_url: imageUrl,
        media_urls: mediaUrls,
        video_url: videoUrl,
        media_generated_at: now,
        status: 'draft',
        updated_at: now,
      })
      .eq('id', draftId);
    if (updateError) throw new Error('Taslak medyası kaydedilemedi: ' + updateError.message);

    await agentLog(db, 'media_generated', 'Taslak yayın medyası üretildi', {
      draftId,
      contentType: draft.content_type,
      imageCount: mediaUrls.length,
      hasVideo: Boolean(videoUrl),
      approvalReset: draft.status !== 'draft',
    });

    // Yeni medya veritabanına güvenle yazıldıktan sonra eski dosyaları temizle.
    const previousImages = [draft.image_url, ...(draft.media_urls ?? [])].filter(
      (url) => !createdImages.includes(url ?? '')
    );
    await removeUrls(db, IMAGE_BUCKET, previousImages);
    if (draft.video_url && draft.video_url !== videoUrl) {
      await removeUrls(db, VIDEO_BUCKET, [draft.video_url]);
    }

    return NextResponse.json({
      ok: true,
      imageUrl,
      mediaUrls,
      videoUrl,
      message:
        draft.content_type === 'reels'
          ? 'Reels videosu hazırlandı. Videoyu izleyip onaylayabilirsiniz.'
          : draft.content_type === 'carousel'
            ? `${mediaUrls.length} karelik carousel hazırlandı. Tüm kareleri kontrol edin.`
            : draft.content_type === 'story'
              ? `${mediaUrls.length} Story karesi hazırlandı. Tüm kareleri kontrol edin.`
              : 'Paylaşım görseli hazırlandı. Görseli kontrol edip onaylayabilirsiniz.',
    });
  } catch (e) {
    // Veritabanına bağlanamadan veya üretim yarıda kesilirse yeni artık dosyaları temizle.
    await removeUrls(db, IMAGE_BUCKET, createdImages);
    await removeUrls(db, VIDEO_BUCKET, createdVideos);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
