import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/drafts → son taslakları döner (dashboard bunu kullanır)
export async function GET() {
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from('content_drafts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ drafts: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
