-- ============================================================
-- Adım 7 Migration — Görsel deposu
--
-- "content-images" adında PUBLIC bir Storage bucket'ı oluşturur.
-- Public olması gerekir: Meta Graph API, paylaşım sırasında görseli
-- bu URL'den indirir (Adım 8).
--
-- Kullanım: Supabase → SQL Editor → yapıştır → Run.
-- Tekrar çalıştırılırsa hata vermez.
--
-- GÜVENLİK NOTU: Bucket public olsa da YAZMA kapalıdır — storage
-- için hiçbir policy tanımlanmaz; yükleme yalnızca server tarafındaki
-- service role ile yapılır. Public olan sadece okuma URL'leridir ve
-- bu görseller zaten Instagram'da yayınlanacak içeriklerdir.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('content-images', 'content-images', true)
on conflict (id) do nothing;

-- Migration logu
insert into agent_logs (action, message, metadata)
select 'migration', 'Adım 7 migration uygulandı (content-images bucket)', '{"step": 7}'::jsonb
where not exists (
  select 1 from agent_logs
  where action = 'migration' and metadata->>'step' = '7'
);
