import { supabaseAdmin } from '@/lib/supabase/server';
import { STATUS_BADGE, TYPE_LABEL } from '@/lib/labels';
import type { ContentDraft } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DraftsPage() {
  let drafts: ContentDraft[] = [];
  let error: string | null = null;

  try {
    const db = supabaseAdmin();
    const res = await db
      .from('content_drafts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (res.error) error = res.error.message;
    else drafts = (res.data ?? []) as ContentDraft[];
  } catch (e) {
    error = e instanceof Error ? e.message : 'Beklenmeyen hata';
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-xl font-semibold">Taslaklar</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Üretilen tüm içerikler ve onay durumları.
      </p>

      {error ? (
        <p className="mt-6 text-sm text-red-300">{error}</p>
      ) : drafts.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-400">
          Henüz taslak yok. Supabase şeması kurulduysa ilk taslak otomatik eklenir.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {d.visual_text || d.caption || '(metin yok)'}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {TYPE_LABEL[d.content_type] ?? d.content_type} ·{' '}
                  {new Date(d.created_at).toLocaleString('tr-TR')}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[d.status].cls}`}
              >
                {STATUS_BADGE[d.status].label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
