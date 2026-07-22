import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { agentLog } from '@/lib/log';
import { isAiEnabled } from '@/lib/content/ai';
import {
  generateDraft,
  GENERATE_MODES,
  type GenerateMode,
} from '@/lib/content/generator';

export const dynamic = 'force-dynamic';
// Claude API çağrısı + olası yeniden deneme için süre payı (Vercel).
export const maxDuration = 60;

/**
 * İçerik üretimi — Adım 4
 *
 * POST /api/generate  → panel butonundan çağrılır.
 *   body: { contentType?: 'auto' | 'post' | 'story' | 'reels' | 'demo' }
 *
 * GET /api/generate   → zamanlanmış (cron) üretim içindir.
 *   Header zorunlu: Authorization: Bearer <AGENT_SECRET>
 *   AGENT_SECRET tanımlı değilse bu yol tamamen kapalıdır.
 *
 * Ortak kural: dashboard'da aksiyon bekleyen bir taslak
 * (draft / approved / failed) varken yeni üretim yapılmaz —
 * onay akışı tek tek ilerler, içerik birikmez.
 */

async function findActiveDraft(db: ReturnType<typeof supabaseAdmin>) {
  const { data, error } = await db
    .from('content_drafts')
    .select('id, status')
    .in('status', ['draft', 'approved', 'failed'])
    .limit(1);
  if (error) throw new Error(error.message);
  return data && data.length > 0 ? data[0] : null;
}

async function runGeneration(mode: GenerateMode, source: 'panel' | 'cron') {
  const db = supabaseAdmin();

  const active = await findActiveDraft(db);
  if (active) {
    return {
      status: 409,
      body: {
        ok: false,
        error:
          'Bekleyen bir taslak zaten var. Önce onu onaylayın, düzenleyin veya reddedin.',
      },
    };
  }

  const result = await generateDraft(db, mode);
  await agentLog(db, 'draft_generated', 'Yeni içerik taslağı üretildi', {
    draftId: result.id,
    topicId: result.topicId,
    contentType: result.contentType,
    textSource: result.source, // 'ai' = Claude ile özgün, 'pool' = hazır havuz
    mode,
    source,
  });

  return {
    status: 200,
    body: {
      ok: true,
      draftId: result.id,
      contentType: result.contentType,
      message:
        result.source === 'ai'
          ? 'Yapay zekâ özgün bir içerik yazdı; onayınız için ön izlemede.'
          : isAiEnabled()
            ? 'Claude\'a ulaşılamadı; hazır konu havuzundan içerik üretildi (ayrıntı loglarda).'
            : 'Hazır konu havuzundan içerik üretildi. Özgün AI üretimi için .env.local\'e ANTHROPIC_API_KEY ekleyin.',
    },
  };
}

// ── Panel butonu ──
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawMode = typeof body?.contentType === 'string' ? body.contentType : 'auto';

    if (!GENERATE_MODES.includes(rawMode as GenerateMode)) {
      return NextResponse.json({ error: 'Geçersiz içerik türü' }, { status: 400 });
    }

    const { status, body: resBody } = await runGeneration(rawMode as GenerateMode, 'panel');
    return NextResponse.json(resBody, { status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

// ── Zamanlanmış üretim (cron) ──
export async function GET(req: Request) {
  try {
    const secret = process.env.AGENT_SECRET;
    if (!secret) {
      // Secret tanımlı değilken cron yolu kapalıdır — panel POST'u etkilenmez.
      return NextResponse.json(
        { error: 'Zamanlanmış üretim kapalı: AGENT_SECRET tanımlı değil.' },
        { status: 503 }
      );
    }

    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      // Log'a asla secret yazılmaz.
      const db = supabaseAdmin();
      await agentLog(db, 'generate_unauthorized', 'Cron üretim isteği reddedildi (yetkisiz)');
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const { status, body } = await runGeneration('auto', 'cron');
    // Cron için 409 hata değil, "atlandı" bilgisidir → 200 dönülür.
    if (status === 409) {
      return NextResponse.json(
        { ok: false, skipped: true, message: 'Bekleyen taslak var, üretim atlandı.' },
        { status: 200 }
      );
    }
    return NextResponse.json(body, { status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
