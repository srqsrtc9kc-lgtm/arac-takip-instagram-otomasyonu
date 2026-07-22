// Bu dosya YALNIZCA server tarafında çalışır.
// "server-only" importu sayesinde bir client component yanlışlıkla
// bu dosyayı import ederse build HATA verir → service role key
// hiçbir koşulda tarayıcıya sızamaz.
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // Hata mesajında gizli bilgi YOK — sadece hangi değişkenin eksik olduğu söylenir.
    throw new Error(
      'Supabase ortam değişkenleri eksik. .env.local dosyasında NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY doldurulmalı.'
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
