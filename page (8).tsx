import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { agentLog } from '@/lib/log';
import { isMetaConfigured, publishToInstagram } from '@/lib/publish/meta';
import type { ContentDraft } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const STALE_CLAIM_MS = 5 * 60 * 1000;

function mediaError(draft: ContentDraft): string | null {
  if (draft.content_type === 'reels' && !draft.video_url) {
    return 'Reels videosu yok. Önce "Medyayı Hazırla" ile videoyu oluşturun.';
  }
  if (draft.content_type === 'carousel' && (draft.media_urls?.length ?? 0) < 2) {
    return 'Carousel kareleri eksik. Önce "Medyayı Hazırla" ile kareleri oluşturun.';
  }
  if (draft.content_type === 'story' && !draft.image_url && !draft.media_urls?.length) {
    return 'Story görseli yok. Önce "Medyayı Hazırla" ile Story karelerini oluşturun.';
  }
  if (
    (draft.content_type === 'post' || draft.content_type === 'demo') &&
    !draft.image_url
  ) {
    return 'Paylaşım görseli yok. Önce "Medyayı Hazırla" ile görseli oluşturun.';
  }
  return null;
}

/** POST /api/publish — yalnızca açıkça onaylanmış taslağı yayınlar. */
export async function POST(req: Request) {
  const db = supabaseAdmin();
  let claimedDraftId: string | null = null;
  let contentType: ContentDraft['content_type'] | null = null;
  let storyCheckpointIds: string[] = [];
  let publishAttemptStarted = false;

  try {
    const body = await req.json().catch(() => null);
    const draftId = typeof body?.draftId === 'string' ? body.draftId : undefined;
    if (!draftId) {
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
    const draft = data as ContentDraft;
    contentType = draft.content_type;

    // Kritik kural: frontend atlansa bile onaysız içerik yayınlanamaz.
    if (draft.status !== 'approved') {
      await agentLog(db, 'publish_blocked', 'Onaysız paylaşım denemesi engellendi', {
        draftId,
        status: draft.status,
      });
      return NextResponse.json(
        { error: 'Bu içerik onaylanmamış. Önce ön izlemeden açıkça onaylayın.' },
        { status: 403 }
      );
    }

    const missingMedia = mediaError(draft);
    if (missingMedia) return NextResponse.json({ error: missingMedia }, { status: 400 });

    const { data: existing } = await db
      .from('published_posts')
      .select('id, status, published_at, instagram_post_ids, content_type')
      .eq('draft_id', draftId)
      .maybeSingle();

    let resumeStoryIds: string[] = [];
    let resumeExisting = false;
    if (existing) {
      const ids = Array.isArray(existing.instagram_post_ids)
        ? (existing.instagram_post_ids as string[])
        : [];
      const age = Date.now() - new Date(existing.published_at as string).getTime();

      if (draft.content_type === 'story' && existing.status === 'partial') {
        resumeStoryIds = ids;
        resumeExisting = true;
      } else if (existing.status === 'publishing' && age > STALE_CLAIM_MS) {
        if (draft.content_type === 'story' && ids.length > 0) {
          resumeStoryIds = ids;
          resumeExisting = true;
        } else {
          // Meta'ya gönderim başlayıp başlamadığı artık kanıtlanamaz. Kaydı
          // koruyup otomatik tekrarı kapatmak, çift paylaşımdan daha güvenlidir.
          await db
            .from('published_posts')
            .update({ status: 'uncertain' })
            .eq('draft_id', draftId);
          return NextResponse.json(
            {
              error:
                'Önceki yayın isteğinin sonucu belirsiz. Çift paylaşımı önlemek için otomatik tekrar durduruldu; Instagram hesabını kontrol edin.',
            },
            { status: 409 }
          );
        }
      } else if (existing.status === 'publishing') {
        return NextResponse.json(
          { error: 'Bu içerik için paylaşım devam ediyor. Birkaç dakika bekleyin.' },
          { status: 409 }
        );
      } else if (existing.status === 'uncertain' || existing.status === 'failed') {
        return NextResponse.json(
          {
            error:
              'Önceki yayın denemesinin sonucu kesin değil. Instagram hesabını kontrol edin; çift paylaşımı önlemek için bu taslak otomatik tekrar gönderilemez.',
          },
          { status: 409 }
        );
      } else {
        return NextResponse.json({ error: 'Bu içerik zaten paylaşılmış.' }, { status: 409 });
      }
    }

    const mode: 'api' | null = isMetaConfigured() ? 'api' : null;

    if (!mode) {
      await agentLog(db, 'publish_pending', 'Onay alındı; Meta yayın bağlantısı eksik', {
        draftId,
      });
      return NextResponse.json({
        ok: false,
        pending: true,
        message:
          'İçerik onaylandı ancak Meta Graph API bağlantısı eksik. Ayarlar sayfasındaki Meta alanlarını tamamlayın; içerik onaylı bekliyor.',
      });
    }

    const now = new Date().toISOString();
    if (resumeExisting) {
      const { error: resumeError } = await db
        .from('published_posts')
        .update({ status: 'publishing', published_at: now })
        .eq('draft_id', draftId);
      if (resumeError) throw new Error(resumeError.message);
    } else {
      const { error: claimError } = await db.from('published_posts').insert({
        draft_id: draftId,
        content_type: draft.content_type,
        caption: draft.caption,
        image_url: draft.image_url,
        media_urls: draft.media_urls,
        video_url: draft.video_url,
        instagram_post_ids: [],
        publish_mode: mode,
        status: 'publishing',
        published_at: now,
      });
      if (claimError) {
        if (claimError.code === '23505') {
          return NextResponse.json(
            { error: 'Bu içerik için paylaşım zaten başlatılmış.' },
            { status: 409 }
          );
        }
        throw new Error(claimError.message);
      }
    }
    claimedDraftId = draftId;

    const hashtags = Array.isArray(draft.hashtags) ? draft.hashtags.join(' ') : '';
    const finalCaption =
      draft.content_type === 'story'
        ? null
        : [draft.caption, hashtags].filter(Boolean).join('\n\n') || null;

    let instagramPostId: string | null = null;
    let instagramPostIds: string[] = [];

    const result = await publishToInstagram({
      contentType: draft.content_type,
      caption: finalCaption,
      imageUrl: draft.image_url,
      mediaUrls: draft.media_urls ?? [],
      videoUrl: draft.video_url,
      alreadyPublishedStoryIds: resumeStoryIds,
      onPublishAttempt: async () => {
        // Bu işaretten sonraki bağlantı hatasında Meta'nın isteği alıp
        // almadığı kesin değildir; claim kaydı silinmemelidir.
        publishAttemptStarted = true;
      },
      onStoryItemPublished: async (ids) => {
        storyCheckpointIds = [...ids];
        const { error: checkpointError } = await db
          .from('published_posts')
          .update({ instagram_post_ids: ids, published_at: new Date().toISOString() })
          .eq('draft_id', draftId);
        if (checkpointError) {
          throw new Error('Story yayın kontrol noktası kaydedilemedi: ' + checkpointError.message);
        }
      },
    });
    instagramPostId = result.instagramPostId;
    instagramPostIds = result.instagramPostIds;

    const finishedAt = new Date().toISOString();
    const { error: recordError } = await db
      .from('published_posts')
      .update({
        instagram_post_id: instagramPostId,
        instagram_post_ids: instagramPostIds,
        status: 'published',
        published_at: finishedAt,
      })
      .eq('draft_id', draftId);
    const { error: draftUpdateError } = await db
      .from('content_drafts')
      .update({ status: 'published', updated_at: finishedAt })
      .eq('id', draftId);

    await agentLog(db, 'publish_success', 'İçerik Instagram’da yayınlandı', {
      draftId,
      instagramPostIds,
      mode,
      contentType: draft.content_type,
      recordWarning: recordError?.message ?? null,
      draftWarning: draftUpdateError?.message ?? null,
    });

    return NextResponse.json({
      ok: true,
      instagramPostId,
      instagramPostIds,
      mode,
      message: recordError || draftUpdateError
        ? 'İçerik Instagram’da yayınlandı; panel kaydı tamamlanamadı. Çift paylaşımı önlemek için tekrar denemeyin.'
        : draft.content_type === 'story' && instagramPostIds.length > 1
          ? `${instagramPostIds.length} Story karesi Instagram'da yayınlandı.`
          : 'İçerik Instagram’da yayınlandı.',
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Bilinmeyen hata';
    if (claimedDraftId) {
      const { data: claim } = await db
        .from('published_posts')
        .select('instagram_post_ids')
        .eq('draft_id', claimedDraftId)
        .maybeSingle();
      const storedIds = Array.isArray(claim?.instagram_post_ids)
        ? (claim?.instagram_post_ids as string[])
        : [];
      const partialIds =
        storyCheckpointIds.length > storedIds.length ? storyCheckpointIds : storedIds;

      const isPartialStory = contentType === 'story' && partialIds.length > 0;
      const isUncertain = publishAttemptStarted && !isPartialStory;

      if (isPartialStory) {
        await db
          .from('published_posts')
          .update({ status: 'partial', published_at: new Date().toISOString() })
          .eq('draft_id', claimedDraftId);
      } else if (isUncertain) {
        await db
          .from('published_posts')
          .update({ status: 'uncertain', published_at: new Date().toISOString() })
          .eq('draft_id', claimedDraftId);
      } else {
        // Hata media_publish çağrısından önce oluştu; Instagram'a gönderim
        // başlamadığı için claim güvenle kaldırılır ve taslak tekrar denenebilir.
        await db.from('published_posts').delete().eq('draft_id', claimedDraftId);
      }
      await db
        .from('content_drafts')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', claimedDraftId);
      await agentLog(db, 'publish_failed', 'Paylaşım başarısız oldu', {
        draftId: claimedDraftId,
        contentType,
        partialCount: partialIds.length,
        uncertain: isUncertain,
        reason: reason.slice(0, 300),
      });

      if (isUncertain) {
        return NextResponse.json(
          {
            error:
              `${reason} Meta'ya yayın isteği gönderildi ancak sonuç kesinleşmedi. ` +
              'Çift paylaşımı önlemek için tekrar denemeyin; Instagram hesabını kontrol edin.',
          },
          { status: 500 }
        );
      }
    }
    return NextResponse.json({ error: reason }, { status: 500 });
  }
}
