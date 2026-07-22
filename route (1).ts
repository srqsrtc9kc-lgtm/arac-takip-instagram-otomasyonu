import { supabaseAdmin } from '@/lib/supabase/server';
import type { PublishedPost } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PublishedPage() {
  let posts: PublishedPost[] = [];
  let error: string | null = null;

  try {
    const db = supabaseAdmin();
    const res = await db
      .from('published_posts')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(50);
    if (res.error) error = res.error.message;
    else posts = (res.data ?? []) as PublishedPost[];
  } catch (e) {
    error = e instanceof Error ? e.message : 'Beklenmeyen hata';
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-xl font-semibold">Yayın Kayıtları</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Instagram&apos;da yayınlanan içeriklerin kaydı.
      </p>

      {error ? (
        <p className="mt-6 text-sm text-red-300">{error}</p>
      ) : posts.length === 0 ? (
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 text-center">
          <p className="text-neutral-300">Henüz paylaşım yapılmadı.</p>
          <p className="mt-2 text-sm text-neutral-500">
            Meta bağlantısı tamamlanıp bir içerik onaylanarak yayınlandıktan sonra
            kayıt burada görünecek.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {posts.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3"
            >
              <p className="truncate text-sm font-medium">{p.caption || '(caption yok)'}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {new Date(p.published_at).toLocaleString('tr-TR')} · mod:{' '}
                {p.publish_mode ?? '—'} · Instagram ID: {p.instagram_post_id ?? '—'} · durum:{' '}
                {p.status ?? '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
