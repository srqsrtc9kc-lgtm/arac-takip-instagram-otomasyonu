// Veritabanı tablolarıyla birebir eşleşen tipler.

export type DraftStatus = 'draft' | 'approved' | 'rejected' | 'published' | 'failed';
export type ContentType = 'post' | 'carousel' | 'story' | 'reels' | 'demo';
export type PublishMode = 'api';

export interface ContentDraft {
  id: string;
  content_type: ContentType;
  goal: string;
  visual_text: string | null;
  visual_subtext: string | null;
  caption: string | null;
  cta: string | null;
  hashtags: string[] | null;
  story_texts: string[] | null;
  carousel_slides: string[] | null;
  reels_script: string | null;
  reels_scenes: string[] | null;
  image_url: string | null;
  media_urls: string[] | null;
  video_url: string | null;
  topic_id: string | null;
  scheduled_for: string | null;
  media_generated_at: string | null;
  status: DraftStatus;
  created_at: string;
  updated_at: string;
  // /api/drafts tarafından published_posts kaydından eklenen salt-okunur durum.
  // Veritabanındaki content_drafts tablosunun bir kolonu değildir.
  publish_record_status?: string | null;
}

export interface PublishedPost {
  id: string;
  draft_id: string | null;
  instagram_post_id: string | null;
  content_type: string | null;
  caption: string | null;
  image_url: string | null;
  media_urls: string[] | null;
  video_url: string | null;
  instagram_post_ids: string[] | null;
  published_at: string;
  publish_mode: PublishMode | null;
  status: string | null;
}

export interface AgentLog {
  id: string;
  action: string;
  message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
