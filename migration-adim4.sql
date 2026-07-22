import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * agent_logs tablosuna kayıt atar.
 *
 * KURAL: Bu fonksiyona ASLA token, şifre veya gizli bilgi geçirilmez.
 * metadata içine yalnızca id, durum, adım gibi zararsız bilgiler yazılır.
 * Log yazımı başarısız olursa ana akış bozulmaz (sadece console'a düşer).
 */
export async function agentLog(
  db: SupabaseClient,
  action: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await db.from('agent_logs').insert({
      action,
      message,
      metadata: metadata ?? null,
    });
    if (error) {
      console.error('agent_logs yazılamadı:', error.message);
    }
  } catch {
    // Log servisi geçici olarak erişilemezse ana iş akışını bozma.
    // Olası istek/header ayrıntılarını yazmayarak gizli değerleri koru.
    console.error('agent_logs yazılamadı: bağlantı hatası');
  }
}
