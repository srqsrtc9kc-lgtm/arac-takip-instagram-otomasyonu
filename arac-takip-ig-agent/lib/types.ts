// Veritabanı tablolarıyla birebir eşleşen tipler.

export type DraftStatus = 'draft' | 'approved' | 'rejected' | 'published' | 'failed';
export type ContentType = 'post' | 'story' | 'reels' | 'demo';
export type PublishMode = 'api' | 'playwright';

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
  reels_script: string | null;
  image_url: string | null;
  topic_id: string | null;
  status: DraftStatus;
  created_at: string;
  updated_at: string;
}

export interface PublishedPost {
  id: string;
  draft_id: string | null;
  instagram_post_id: string | null;
  content_type: string | null;
  caption: string | null;
  image_url: string | null;
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
