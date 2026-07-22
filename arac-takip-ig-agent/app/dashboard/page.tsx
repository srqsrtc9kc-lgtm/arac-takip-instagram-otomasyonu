'use client';

import { useCallback, useEffect, useState } from 'react';
import { STATUS_BADGE, TYPE_LABEL } from '@/lib/labels';
import type { ContentDraft } from '@/lib/types';

interface EditFields {
  visual_text: string;
  visual_subtext: string;
  caption: string;
  cta: string;
  hashtags: string; // boşlukla ayrılmış
  story_texts: string; // her satır bir story
  reels_script: string;
}

type GenType = 'auto' | 'post' | 'story' | 'reels' | 'demo';

export default function DashboardPage() {
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [hasRejected, setHasRejected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<EditFields | null>(null);
  const [genType, setGenType] = useState<GenType>('auto');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/drafts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Taslaklar yüklenemedi');
      const drafts: ContentDraft[] = data.drafts || [];
      // Aksiyon bekleyen en güncel taslak: draft / approved / failed
      const active =
        drafts.find(
          (d) => d.status === 'draft' || d.status === 'approved' || d.status === 'failed'
        ) || null;
      setDraft(active);
      setHasRejected(drafts.some((d) => d.status === 'rejected'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen hata');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit() {
    if (!draft) return;
    setFields({
      visual_text: draft.visual_text ?? '',
      visual_subtext: draft.visual_subtext ?? '',
      caption: draft.caption ?? '',
      cta: draft.cta ?? '',
      hashtags: (draft.hashtags ?? []).join(' '),
      story_texts: (draft.story_texts ?? []).join('\n'),
      reels_script: draft.reels_script ?? '',
    });
    setEditing(true);
    setNotice(null);
    setError(null);
  }

  async function saveEdit() {
    if (!draft || !fields) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          fields: {
            visual_text: fields.visual_text,
            visual_subtext: fields.visual_subtext,
            caption: fields.caption,
            cta: fields.cta,
            hashtags: fields.hashtags.split(/[\s,]+/).filter(Boolean),
            story_texts: fields.story_texts
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
            reels_script: fields.reels_script,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kaydedilemedi');
      setEditing(false);
      setNotice(
        draft.image_url
          ? 'Düzenleme kaydedildi. İçerik yeniden onay bekliyor; görsel sıfırlandı, yeniden oluşturun.'
          : 'Düzenleme kaydedildi. İçerik yeniden onay bekliyor.'
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen hata');
    } finally {
      setBusy(false);
    }
  }

  async function approveAndPublish() {
    if (!draft) return;

    // Görsel ön koşulu: post/story/demo görselsiz paylaşılamaz (reels'te video kullanıcıda).
    if (!draft.image_url && draft.content_type !== 'reels') {
      setError('Önce "Görseli Oluştur" ile paylaşım görselini oluşturun; onay, gördüğünüz görsele verilir.');
      return;
    }

    const ok = window.confirm(
      'Bu içerik onayınızla paylaşım akışına gönderilecek. Devam edilsin mi?'
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // 1) Henüz onaylı değilse onayla
      if (draft.status !== 'approved') {
        const res = await fetch(`/api/drafts/${draft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Onaylanamadı');
      }

      // 2) Paylaşım isteği — backend, durumu 'approved' değilse zaten reddeder
      const pub = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id }),
      });
      const pubData = await pub.json();
      if (!pub.ok) throw new Error(pubData.error || 'Paylaşım hatası');
      setNotice(pubData.message || (pubData.ok ? 'Paylaşım tamamlandı.' : 'Paylaşım beklemede.'));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen hata');
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!draft) return;
    if (!window.confirm('Taslak reddedilsin mi?')) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reddedilemedi');
      setNotice('Taslak reddedildi. Yeni içerik üretebilirsiniz.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen hata');
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: genType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İçerik üretilemedi');
      setNotice(data.message || 'Yeni içerik üretildi.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen hata');
    } finally {
      setBusy(false);
    }
  }

  async function generateImage() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Görsel oluşturulamadı');
      setNotice(data.message || 'Görsel oluşturuldu.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Beklenmeyen hata');
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-blue-500';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Başlık + durum rozeti */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Bugünün İçeriği</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Ön izle → onayla → paylaş. Onay olmadan hiçbir paylaşım yapılmaz.
          </p>
        </div>
        {draft && (
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_BADGE[draft.status].cls}`}
          >
            {STATUS_BADGE[draft.status].label}
          </span>
        )}
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-400">Yükleniyor…</p>
      ) : !draft ? (
        /* ── İÇERİK ÜRETİM KARTI (Adım 4) ── */
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-8 text-center">
          <p className="text-neutral-300">Bekleyen içerik taslağı yok.</p>
          <p className="mt-2 text-sm text-neutral-500">
            {hasRejected
              ? 'Son taslak reddedildi. Aşağıdan yeni içerik üretebilirsiniz.'
              : 'Konu havuzundan yeni içerik üretin; önce burada ön izlenir.'}
          </p>

          <div className="mx-auto mt-6 flex max-w-md flex-col items-stretch gap-3 sm:flex-row">
            <select
              value={genType}
              onChange={(e) => setGenType(e.target.value as GenType)}
              disabled={busy}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
              aria-label="İçerik türü"
            >
              <option value="auto">Otomatik (haftalık ritim)</option>
              <option value="post">Post</option>
              <option value="story">Story</option>
              <option value="reels">Reels</option>
              <option value="demo">Demo Paylaşımı</option>
            </select>
            <button
              onClick={generate}
              disabled={busy}
              className="flex-1 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {busy ? 'Üretiliyor…' : 'İçerik Üret'}
            </button>
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            Üretilen içerik paylaşılmaz; onayınız için ön izlemeye düşer.
          </p>
        </div>
      ) : editing && fields ? (
        /* ── DÜZENLEME FORMU ── */
        <div className="max-w-2xl space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-400">Görsel metni</span>
            <input
              className={inputCls}
              value={fields.visual_text}
              onChange={(e) => setFields({ ...fields, visual_text: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-400">Görsel alt metni</span>
            <input
              className={inputCls}
              value={fields.visual_subtext}
              onChange={(e) => setFields({ ...fields, visual_subtext: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-400">Caption</span>
            <textarea
              className={inputCls}
              rows={9}
              value={fields.caption}
              onChange={(e) => setFields({ ...fields, caption: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-400">CTA</span>
            <input
              className={inputCls}
              value={fields.cta}
              onChange={(e) => setFields({ ...fields, cta: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-400">
              Hashtagler (boşlukla ayırın)
            </span>
            <input
              className={inputCls}
              value={fields.hashtags}
              onChange={(e) => setFields({ ...fields, hashtags: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-400">
              Story metinleri (her satır bir story)
            </span>
            <textarea
              className={inputCls}
              rows={3}
              value={fields.story_texts}
              onChange={(e) => setFields({ ...fields, story_texts: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-neutral-400">
              Reels sahne planı (varsa)
            </span>
            <textarea
              className={inputCls}
              rows={4}
              value={fields.reels_script}
              onChange={(e) => setFields({ ...fields, reels_script: e.target.value })}
            />
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={saveEdit}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Kaydet
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={busy}
              className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              Vazgeç
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            Not: Kaydedilen düzenleme sonrası içerik yeniden onay bekler.
          </p>
        </div>
      ) : (
        /* ── ÖN İZLEME ── */
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Görsel: üretildiyse gerçek PNG, yoksa temsili kart */}
            <div>
              {draft.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={draft.image_url}
                  src={draft.image_url}
                  alt={draft.visual_text ?? 'İçerik görseli'}
                  className={`w-full rounded-2xl border border-neutral-800 ${
                    draft.content_type === 'story' || draft.content_type === 'reels'
                      ? 'mx-auto max-w-[320px]'
                      : ''
                  }`}
                />
              ) : (
                <div className="flex aspect-square flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
                  <p className="text-sm font-semibold tracking-wide text-blue-400">
                    Araç Takip Paneli
                  </p>
                  <div>
                    <p className="text-2xl font-bold leading-snug md:text-3xl">
                      {draft.visual_text || '(görsel metni yok)'}
                    </p>
                    {draft.visual_subtext && (
                      <p className="mt-3 text-neutral-400">{draft.visual_subtext}</p>
                    )}
                  </div>
                  {draft.cta && <p className="text-xs text-neutral-500">{draft.cta}</p>}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-neutral-500">
                  {draft.image_url
                    ? 'Paylaşılacak görselin kendisi bu.'
                    : draft.content_type === 'reels'
                      ? 'Temsili kart. Kapak görseli oluşturabilirsiniz; video çekimi sahne planına göre yapılır.'
                      : 'Temsili kart — paylaşımdan önce gerçek görseli oluşturun.'}
                </p>
                <button
                  onClick={generateImage}
                  disabled={busy}
                  className="shrink-0 rounded-lg border border-neutral-700 px-4 py-2 text-xs font-medium hover:bg-neutral-800 disabled:opacity-50"
                >
                  {draft.image_url ? 'Görseli Yenile' : 'Görseli Oluştur'}
                </button>
              </div>
            </div>

            {/* Metin blokları */}
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
                  <p className="text-xs text-neutral-500">İçerik türü</p>
                  <p className="mt-1 text-sm font-medium">
                    {TYPE_LABEL[draft.content_type] ?? draft.content_type}
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
                  <p className="text-xs text-neutral-500">Amaç</p>
                  <p className="mt-1 text-sm font-medium">{draft.goal}</p>
                </div>
              </div>

              <section>
                <h2 className="mb-2 text-sm font-semibold text-neutral-300">Caption</h2>
                <p className="whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-sm leading-relaxed text-neutral-200">
                  {draft.caption || '(caption yok)'}
                </p>
              </section>

              {draft.hashtags && draft.hashtags.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-neutral-300">Hashtagler</h2>
                  <div className="flex flex-wrap gap-2">
                    {draft.hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {draft.story_texts && draft.story_texts.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-neutral-300">
                    Story desteği
                  </h2>
                  <div className="space-y-2">
                    {draft.story_texts.map((s, i) => (
                      <p
                        key={i}
                        className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-2.5 text-sm text-neutral-200"
                      >
                        {s}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              {draft.reels_script && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-neutral-300">
                    Reels sahne planı
                  </h2>
                  <p className="whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-200">
                    {draft.reels_script}
                  </p>
                </section>
              )}
            </div>
          </div>

          {/* Aksiyon butonları */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={approveAndPublish}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {draft.status === 'approved' || draft.status === 'failed'
                ? 'Paylaşımı Tekrar Dene'
                : 'Onayla ve Paylaş'}
            </button>
            <button
              onClick={startEdit}
              disabled={busy}
              className="rounded-lg border border-neutral-700 px-5 py-2.5 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              Düzenle
            </button>
            <button
              onClick={reject}
              disabled={busy}
              className="rounded-lg border border-red-500/40 px-5 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              Reddet / Yeniden Üret
            </button>
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Onay dışında hiçbir aksiyon paylaşım sayılmaz. Backend, onaylı olmayan
            taslakların paylaşımını ayrıca engeller.
          </p>
        </>
      )}
    </div>
  );
}
