import type { ContentType, DraftStatus } from './types';

// Durum rozetleri — tüm sayfalarda aynı görünüm için tek kaynak.
export const STATUS_BADGE: Record<DraftStatus, { label: string; cls: string }> = {
  draft: {
    label: 'Onay Bekliyor',
    cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  approved: {
    label: 'Onaylandı',
    cls: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  },
  rejected: {
    label: 'Reddedildi',
    cls: 'border-red-500/40 bg-red-500/10 text-red-300',
  },
  published: {
    label: 'Paylaşıldı',
    cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
  failed: {
    label: 'Başarısız',
    cls: 'border-red-500/40 bg-red-500/10 text-red-300',
  },
};

export const TYPE_LABEL: Record<ContentType, string> = {
  post: 'Post',
  story: 'Story',
  reels: 'Reels',
  demo: 'Demo Paylaşımı',
};
