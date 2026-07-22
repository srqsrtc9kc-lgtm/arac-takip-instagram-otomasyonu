-- ============================================================
-- Adım 4 Migration — İçerik üretim modülü
--
-- KİM ÇALIŞTIRMALI: schema.sql'i Adım 1–3 sürümüyle DAHA ÖNCE
-- kurmuş olanlar. Sıfırdan kuruluyorsanız buna gerek yok;
-- güncel schema.sql zaten topic_id içeriyor.
--
-- Kullanım: Supabase → SQL Editor → yapıştır → Run.
-- Tekrar çalıştırılırsa hata vermez, çift kayıt oluşturmaz.
-- ============================================================

-- 1) Konu kimliği kolonu (üretici aynı konuyu tekrar seçmesin diye)
alter table content_drafts add column if not exists topic_id text;

-- 2) Kurulumdaki ilk taslağı 'excel-karisikligi' konusuyla eşle
--    (aynı konu havuzda da var; işaretlenmezse üretici benzerini üretebilir)
update content_drafts
set topic_id = 'excel-karisikligi'
where topic_id is null
  and visual_text like 'Rent a car araç takibi%';

-- 3) Migration logu
insert into agent_logs (action, message, metadata)
select 'migration', 'Adım 4 migration uygulandı (topic_id)', '{"step": 4}'::jsonb
where not exists (
  select 1 from agent_logs
  where action = 'migration' and metadata->>'step' = '4'
);
