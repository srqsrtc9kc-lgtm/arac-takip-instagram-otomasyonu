// Bu dosya YALNIZCA server tarafında çalışır (access token kullanır).
import 'server-only';

/**
 * META GRAPH API İSTEMCİSİ — Adım 8 (Mod 1, önerilen yol)
 *
 * Akış (Instagram Content Publishing API):
 *   1) POST /{IG_USER_ID}/media          → media container oluştur (image_url + caption)
 *   2) GET  /{container}?fields=status_code → FINISHED olana kadar bekle
 *   3) POST /{IG_USER_ID}/media_publish  → creation_id ile yayınla
 *
 * GÜVENLİK:
 * - META_ACCESS_TOKEN hiçbir hata mesajında, logda veya yanıtta yer almaz;
 *   tüm hata metinleri sanitize() süzgecinden geçer.
 * - Token POST isteklerinde gövdede taşınır (URL'de değil).
 *
 * GEREKSİNİMLER (Meta tarafında, bir kez):
 * - Instagram hesabı "profesyonel" (işletme/içerik üretici) olmalı ve
 *   bir Facebook Sayfası'na bağlanmalı.
 * - Meta uygulamanızın tokenında instagram_content_publish +
 *   instagram_basic + pages_read_engagement izinleri olmalı.
 * - Uzun ömürlü token kullanın; süresi dolarsa hata mesajı bunu söyler.
 */

// Graph API sürümü — Meta eski sürümleri ~2 yıl destekler.
// Süresi dolarsa buradan güncellemek yeterli.
const GRAPH_VERSION = 'v22.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Container işleme beklemesi: görseller genelde saniyeler içinde hazır olur.
const STATUS_POLL_ATTEMPTS = 10;
const STATUS_POLL_DELAY_MS = 2500;

export type PublishableType = 'post' | 'demo' | 'story';

interface MetaEnv {
  ok: boolean;
  missing: string[];
  accessToken: string;
  igUserId: string;
}

/**
 * Spec gereği dört değişkenin de dolu olması beklenir.
 * API çağrılarında IG_USER_ID kullanılır (profesyonel Instagram hesabının
 * kimliği). FB_PAGE_ID ve INSTAGRAM_ACCOUNT_ID kurulum/doğrulama içindir,
 * paylaşım çağrılarında doğrudan geçmez.
 */
export function getMetaEnv(): MetaEnv {
  const accessToken = process.env.META_ACCESS_TOKEN ?? '';
  const igUserId = process.env.IG_USER_ID ?? '';
  const missing: string[] = [];
  if (!accessToken) missing.push('META_ACCESS_TOKEN');
  if (!igUserId) missing.push('IG_USER_ID');
  if (!process.env.FB_PAGE_ID) missing.push('FB_PAGE_ID');
  if (!process.env.INSTAGRAM_ACCOUNT_ID) missing.push('INSTAGRAM_ACCOUNT_ID');
  return { ok: missing.length === 0, missing, accessToken, igUserId };
}

export function isMetaConfigured(): boolean {
  return getMetaEnv().ok;
}

/** Token'ı her türlü hata metninden ayıklar. */
function sanitize(message: string, token: string): string {
  if (!token) return message;
  return message.split(token).join('[GİZLİ]');
}

interface GraphError {
  message?: string;
  code?: number;
  error_subcode?: number;
}

/** Sık görülen Graph API hatalarına Türkçe ipucu ekler. */
function hintFor(err: GraphError | undefined): string {
  if (!err) return '';
  const c = err.code;
  const sub = err.error_subcode;
  if (c === 190) return 'Erişim tokenı geçersiz veya süresi dolmuş — Meta panelinden yenileyip META_ACCESS_TOKEN değerini güncelleyin. ';
  if (c === 10 || (c !== undefined && c >= 200 && c <= 299))
    return 'Token izinleri yetersiz — instagram_content_publish izni gerekli. ';
  if (c === 4 || c === 17 || c === 32 || c === 613)
    return 'Meta API istek limiti aşıldı — bir süre bekleyip yeniden deneyin. ';
  if (sub === 2207003 || sub === 2207026 || c === 9004)
    return "Meta görseli indiremedi — görsel URL'i herkese açık olmalı (Storage bucket'ı public mi?). ";
  return '';
}

async function graphFetch(
  url: string,
  init: RequestInit,
  token: string
): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, cache: 'no-store' });
  } catch (e) {
    const raw = e instanceof Error ? e.message : 'bağlantı hatası';
    throw new Error(sanitize('Meta API isteği gönderilemedi: ' + raw, token));
  }

  const json = (await res.json().catch(() => null)) as
    | (Record<string, unknown> & { error?: GraphError })
    | null;

  if (!res.ok || json?.error) {
    const err = json?.error;
    const detail = err?.message
      ? `${err.message} (kod ${err.code ?? '?'}${err.error_subcode ? '/' + err.error_subcode : ''})`
      : `HTTP ${res.status}`;
    throw new Error(sanitize(`${hintFor(err)}Meta API hatası: ${detail}`, token));
  }
  return json ?? {};
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Görseli Instagram'da yayınlar; Instagram medya kimliğini döner.
 * ÖNEMLİ: Bu fonksiyon onay kontrolü YAPMAZ — kritik kural (yalnızca
 * 'approved' taslaklar) /api/publish endpoint'inde uygulanır. Buraya
 * yalnızca onaydan geçmiş içerik ulaşır.
 */
export async function publishToInstagram(params: {
  imageUrl: string;
  caption: string | null;
  contentType: PublishableType;
}): Promise<{ instagramPostId: string; containerId: string }> {
  const env = getMetaEnv();
  if (!env.ok) {
    throw new Error('Meta API bilgileri eksik: ' + env.missing.join(', '));
  }
  const { accessToken, igUserId } = env;

  // ── 1) Media container ──
  const form = new URLSearchParams();
  form.set('image_url', params.imageUrl);
  if (params.contentType === 'story') {
    form.set('media_type', 'STORIES'); // story'de caption kullanılmaz
  } else if (params.caption) {
    form.set('caption', params.caption);
  }
  form.set('access_token', accessToken);

  const created = await graphFetch(
    `${GRAPH_BASE}/${igUserId}/media`,
    { method: 'POST', body: form },
    accessToken
  );
  const containerId = created?.id ? String(created.id) : '';
  if (!containerId) {
    throw new Error('Media container oluşturulamadı (Meta kimlik dönmedi).');
  }

  // ── 2) FINISHED olana kadar bekle ──
  const statusUrl = `${GRAPH_BASE}/${containerId}?fields=status_code&access_token=${encodeURIComponent(accessToken)}`;
  let status = '';
  for (let i = 0; i < STATUS_POLL_ATTEMPTS; i++) {
    const st = await graphFetch(statusUrl, { method: 'GET' }, accessToken);
    status = typeof st?.status_code === 'string' ? st.status_code : '';
    if (status === 'FINISHED') break;
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new Error(
        `Meta görseli işleyemedi (durum: ${status}). Görsel URL'inin herkese açık olduğundan emin olun.`
      );
    }
    await wait(STATUS_POLL_DELAY_MS);
  }
  if (status !== 'FINISHED') {
    throw new Error(
      'Görsel işleme zaman aşımına uğradı. Birkaç dakika sonra "Paylaşımı Tekrar Dene" ile yeniden deneyin.'
    );
  }

  // ── 3) Yayınla ──
  const pubForm = new URLSearchParams();
  pubForm.set('creation_id', containerId);
  pubForm.set('access_token', accessToken);

  const published = await graphFetch(
    `${GRAPH_BASE}/${igUserId}/media_publish`,
    { method: 'POST', body: pubForm },
    accessToken
  );
  const instagramPostId = published?.id ? String(published.id) : '';
  if (!instagramPostId) {
    throw new Error('media_publish yanıtında medya kimliği yok.');
  }

  return { instagramPostId, containerId };
}
