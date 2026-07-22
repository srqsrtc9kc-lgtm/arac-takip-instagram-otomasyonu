// Bu dosya YALNIZCA server tarafında çalışır (API anahtarı kullanır).
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContentType } from '../types';
import { FORBIDDEN_PHRASES, findForbiddenPhrase } from './language';
import { BASE_HASHTAGS } from './topics';
import { agentLog } from '../log';

/**
 * YAPAY ZEKÂ METİN ÜRETİMİ — Claude API
 *
 * ANTHROPIC_API_KEY doluysa içerikler her seferinde ÖZGÜN olarak
 * Claude tarafından yazılır. Anahtar yoksa sistem otomatik olarak
 * hazır konu havuzuna döner (generator.ts) — panel asla kırılmaz.
 *
 * GÜVENCELER:
 * - Üretilen her metin yayınlanmadan önce yasaklı ifade denetiminden
 *   geçer (language.ts). İhlal varsa Claude'a hatası söylenerek bir kez
 *   daha denenir; yine olmazsa hazır havuza dönülür ve loglanır.
 * - CTA ve hashtag seti SABİTTİR; Claude'un çıktısı ne olursa olsun
 *   bu iki alan kod tarafından yazılır (marka tutarlılığı).
 * - API anahtarı hiçbir logda/hatada görünmez.
 * - Kritik kural değişmez: AI yalnızca TASLAK üretir; onaysız paylaşım yok.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
// Model gerekirse buradan güncellenir.
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1500;

const FIXED_CTA = "Demo için DM'den PANEL yazın.";

export function isAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface AiDraftFields {
  goal: string;
  visual_text: string;
  visual_subtext: string | null;
  caption: string | null;
  cta: string;
  hashtags: string[];
  story_texts: string[] | null;
  reels_script: string | null;
}

/** Anahtarı her türlü hata metninden ayıklar. */
function sanitize(message: string): string {
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? message.split(key).join('[GİZLİ]') : message;
}

// ── Marka ve dil talimatı (system prompt) ──
const SYSTEM_PROMPT = `Sen "Araç Takip Paneli" markasının Instagram içerik yazarısın.

MARKA: Araç Takip Paneli — rent a car işletmeleri için araç, müşteri, ödeme ve sözleşme takibini tek panelde toplayan bir yazılım.
HEDEF KİTLE: 5–50 araçlık rent a car işletme sahipleri (Türkiye). Çoğu takibi defter, Excel ve WhatsApp ile yapıyor.
AMAÇ: Okuyanın DM'den demo istemesi.

DİL KURALLARI (KESİN):
- Sade, net, abartısız Türkçe. Esnaf diliyle konuş, samimi ama profesyonel.
- Soru odaklı giriş etkilidir: okuyanın yaşadığı gerçek bir sorunu sor.
- Akış: sorun → panelin bunu nasıl çözdüğü → demo daveti.
- ŞU İFADELER KESİNLİKLE YASAK: ${FORBIDDEN_PHRASES.join(', ')}
- İngilizce SaaS klişeleri, gereksiz teknik terim, ünlem enflasyonu ve emoji YASAK.
- Rakiplerden bahsetme, kimseyi küçümseme, hedef kitleyi suçlama.

ÇIKTI: SADECE geçerli JSON döndür. Öncesinde/sonrasında hiçbir açıklama, markdown kod bloğu (\`\`\`) olmasın.`;

// ── İçerik türüne göre istenen JSON yapısı ──
function formatInstructions(type: ContentType): string {
  switch (type) {
    case 'story':
      return `İçerik türü: STORY (3 kare).
JSON yapısı:
{
  "goal": "kısa amaç cümlesi",
  "visual_text": "1. karenin metni (soru, en fazla 60 karakter)",
  "story_texts": ["1. kare metni (visual_text ile aynı)", "2. kare: sorunun günlük hayattaki karşılığı", "3. kare: çözüm + 'DM: PANEL' daveti"]
}`;
    case 'reels':
      return `İçerik türü: REELS (kısa video sahne planı; video kullanıcı tarafından çekilecek).
JSON yapısı:
{
  "goal": "kısa amaç cümlesi",
  "visual_text": "kapak metni (soru, en fazla 60 karakter)",
  "caption": "2-3 kısa paragraf; sorun ve panelin çözümü; sonda demo daveti YOK (CTA ayrıca eklenecek)",
  "reels_script": "SAHNE 1 (0-3 sn): ...\\nSAHNE 2 (...): ...\\n... şeklinde 4-6 sahne + KAPANIŞ; her sahnede ne çekileceği ve ekran metni"
}`;
    case 'demo':
      return `İçerik türü: DEMO TANITIMI (panelin içini anlatan post).
JSON yapısı:
{
  "goal": "kısa amaç cümlesi",
  "visual_text": "panelin içine davet eden başlık (en fazla 60 karakter)",
  "visual_subtext": "tek cümlelik alt metin (en fazla 70 karakter)",
  "caption": "panelin 3-4 ana ekranını sade maddelerle anlatan metin; sonda demo daveti YOK (CTA ayrıca eklenecek)",
  "story_texts": ["destekleyici story metni 1", "destekleyici story metni 2 (sonu 'DM: PANEL')"]
}`;
    default:
      return `İçerik türü: POST (tek kare gönderi).
JSON yapısı:
{
  "goal": "kısa amaç cümlesi",
  "visual_text": "görsel üzerindeki ana başlık (çarpıcı soru, en fazla 60 karakter)",
  "visual_subtext": "tek cümlelik alt metin (en fazla 70 karakter)",
  "caption": "3-5 kısa paragraf; boş satırla ayrılmış; sorun → çözüm; sonda demo daveti YOK (CTA ayrıca eklenecek)",
  "story_texts": ["destekleyici story metni 1", "destekleyici story metni 2 (sonu 'DM: PANEL')"]
}`;
  }
}

// ── Claude API çağrısı ──
async function callClaude(userPrompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY as string;
  // Zaman aşımı: Claude 45 sn içinde yanıt vermezse istek iptal edilir
  // (Vercel fonksiyon süresi dolmadan kontrollü hata verilir).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
  } catch (e) {
    clearTimeout(timer);
    const aborted = e instanceof Error && e.name === 'AbortError';
    const raw = aborted
      ? 'yanıt 45 saniyede gelmedi (zaman aşımı)'
      : e instanceof Error
        ? e.message
        : 'bağlantı hatası';
    throw new Error(sanitize('Claude API isteği gönderilemedi: ' + raw));
  }
  clearTimeout(timer);

  const json = (await res.json().catch(() => null)) as {
    content?: Array<{ type: string; text?: string }>;
    error?: { message?: string; type?: string };
  } | null;

  if (!res.ok || json?.error) {
    const detail = json?.error?.message ?? `HTTP ${res.status}`;
    const hint =
      res.status === 401
        ? 'ANTHROPIC_API_KEY geçersiz görünüyor — console.anthropic.com üzerinden kontrol edin. '
        : res.status === 429
          ? 'API istek limiti aşıldı — kısa bir süre sonra deneyin. '
          : '';
    throw new Error(sanitize(`${hint}Claude API hatası: ${detail}`));
  }

  const text = (json?.content ?? [])
    .map((b) => (b.type === 'text' ? (b.text ?? '') : ''))
    .join('');
  if (!text.trim()) throw new Error('Claude API boş yanıt döndürdü.');
  return text;
}

// ── JSON ayrıştırma (kod bloğu çitlerine dayanıklı) ──
function parseJson(text: string): Record<string, unknown> {
  let t = text.trim().replace(/```json|```/g, '').trim();
  // Yanıtın başında/sonunda açıklama kalmışsa ilk { ile son } arasını al
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a !== -1 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t) as Record<string, unknown>;
}

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

// ── Çıktıyı doğrula ve sabit alanları uygula ──
function toFields(type: ContentType, raw: Record<string, unknown>): AiDraftFields {
  const visual_text = str(raw.visual_text);
  if (!visual_text) throw new Error('Claude çıktısında visual_text yok.');

  const storyArr = Array.isArray(raw.story_texts)
    ? (raw.story_texts as unknown[]).map(str).filter((s): s is string => Boolean(s))
    : null;

  const fields: AiDraftFields = {
    goal: str(raw.goal) ?? "DM'den demo talebi almak",
    visual_text,
    visual_subtext: str(raw.visual_subtext),
    caption: str(raw.caption),
    cta: FIXED_CTA, // sabit — Claude'un çıktısına bakılmaz
    hashtags: BASE_HASHTAGS, // sabit set
    story_texts: storyArr && storyArr.length > 0 ? storyArr : null,
    reels_script: str(raw.reels_script),
  };

  // Tür bazlı asgari alan kontrolü
  if (type === 'story' && (!fields.story_texts || fields.story_texts.length < 2)) {
    throw new Error('Story için en az 2 kare metni gerekli.');
  }
  if (type === 'reels' && !fields.reels_script) {
    throw new Error('Reels için sahne planı gerekli.');
  }
  if ((type === 'post' || type === 'demo') && !fields.caption) {
    throw new Error('Post için caption gerekli.');
  }
  if (type === 'story') fields.caption = null; // story'de caption kullanılmaz

  // Caption'ın sonuna sabit CTA'yı ekle (Claude'a "ekleme" demiştik)
  if (fields.caption && !fields.caption.includes('PANEL')) {
    fields.caption = fields.caption + "\n\nDemo görmek için DM'den 'PANEL' yazabilirsiniz.";
  }

  return fields;
}

/**
 * Claude ile özgün taslak metinleri üretir.
 * Yasaklı ifade çıkarsa hatayı söyleyerek BİR kez daha dener.
 * Yine olmazsa hata fırlatır (çağıran taraf hazır havuza düşer).
 */
export async function aiGenerateFields(
  db: SupabaseClient,
  type: ContentType
): Promise<AiDraftFields> {
  // Tekrar önleme: son üretilen başlıkları Claude'a bildir
  const { data: recent } = await db
    .from('content_drafts')
    .select('visual_text')
    .order('created_at', { ascending: false })
    .limit(10);
  const recentTitles = (recent ?? [])
    .map((r) => r.visual_text as string | null)
    .filter(Boolean) as string[];

  const basePrompt =
    `${formatInstructions(type)}\n\n` +
    (recentTitles.length
      ? `DAHA ÖNCE KULLANILAN BAŞLIKLAR (bunlardan ve konularından FARKLI bir açı seç):\n- ${recentTitles.join('\n- ')}\n\n`
      : '') +
    `Rent a car işletmecisinin GERÇEK bir gündelik sorununu seç (ör. ödeme takibi, çakışan rezervasyon, kaybolan sözleşme, bakım, kapora, ay sonu hesabı, müşteri geçmişi, teslim kontrolü — ya da bunların dışında özgün bir açı). Şimdi içeriği üret.`;

  let attempt = 0;
  let feedback = '';
  while (attempt < 2) {
    attempt++;
    const text = await callClaude(basePrompt + feedback);
    let fields: AiDraftFields;
    try {
      fields = toFields(type, parseJson(text));
    } catch (e) {
      const why = e instanceof Error ? e.message : 'çıktı ayrıştırılamadı';
      if (attempt >= 2) throw new Error('Claude çıktısı geçersiz: ' + why);
      feedback = `\n\nÖNCEKİ DENEMEN GEÇERSİZDİ (${why}). SADECE istenen JSON yapısını döndür.`;
      continue;
    }

    const forbidden = findForbiddenPhrase([
      fields.visual_text,
      fields.visual_subtext,
      fields.caption,
      ...(fields.story_texts ?? []),
      fields.reels_script,
    ]);
    if (!forbidden) return fields;

    await agentLog(db, 'ai_language_retry', 'Claude çıktısında yasaklı ifade, yeniden deneniyor', {
      phrase: forbidden,
      attempt,
    });
    if (attempt >= 2) {
      throw new Error(`Claude çıktısında yasaklı ifade ("${forbidden}") ısrar etti.`);
    }
    feedback = `\n\nÖNCEKİ DENEMENDE YASAKLI İFADE VARDI: "${forbidden}". Bu ifadeyi ve benzerlerini KULLANMADAN yeniden üret.`;
  }
  throw new Error('Claude üretimi tamamlanamadı.'); // buraya normalde gelinmez
}
