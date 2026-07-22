-- ============================================================
-- Araç Takip Paneli — Instagram Operasyon Agent'ı
-- Supabase SQL şeması (Adım 2)
--
-- Kullanım: Supabase Dashboard → SQL Editor → bu dosyayı
-- yapıştır → Run. Tekrar çalıştırılırsa çift kayıt oluşturmaz.
-- ============================================================

-- ── 1) İçerik taslakları ──
create table if not exists content_drafts (
  id            uuid primary key default gen_random_uuid(),
  content_type  text not null check (content_type in ('post', 'story', 'reels', 'demo')),
  goal          text not null,
  visual_text   text,           -- görselin üzerindeki ana metin
  visual_subtext text,          -- görseldeki alt metin
  caption       text,
  cta           text,
  hashtags      text[],
  story_texts   text[],
  reels_script  text,
  image_url     text,           -- üretilen görselin public URL'i (Adım 7)
  topic_id      text,           -- konu havuzu kimliği (tekrarı önlemek için, Adım 4)
  status        text not null default 'draft'
                check (status in ('draft', 'approved', 'rejected', 'published', 'failed')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 2) Paylaşılan içerik kayıtları ──
-- draft_id UNIQUE: aynı taslağın iki kez paylaşılmasını
-- veritabanı seviyesinde imkânsız kılar (kritik kural desteği).
create table if not exists published_posts (
  id                 uuid primary key default gen_random_uuid(),
  draft_id           uuid unique references content_drafts(id),
  instagram_post_id  text,
  content_type       text,
  caption            text,
  image_url          text,
  published_at       timestamptz not null default now(),
  publish_mode       text check (publish_mode in ('api', 'playwright')),
  status             text
);

-- ── 3) Agent işlem logları ──
-- ÖNEMLİ: Bu tabloya asla token / şifre / gizli bilgi yazılmaz.
create table if not exists agent_logs (
  id         uuid primary key default gen_random_uuid(),
  action     text not null,
  message    text,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

-- ── İndeksler ──
create index if not exists idx_content_drafts_status     on content_drafts (status);
create index if not exists idx_content_drafts_created_at on content_drafts (created_at desc);
create index if not exists idx_agent_logs_created_at     on agent_logs (created_at desc);

-- ── Güvenlik: RLS ──
-- RLS açık ve hiçbir politika tanımlı değil → anon key ile bu
-- tablolara ERİŞİLEMEZ. Tüm erişim server tarafında
-- SUPABASE_SERVICE_ROLE_KEY ile yapılır (RLS'i bypass eder).
alter table content_drafts  enable row level security;
alter table published_posts enable row level security;
alter table agent_logs      enable row level security;

-- ── Storage: paylaşım görselleri (Adım 7) ──
-- PUBLIC bucket: Meta Graph API paylaşım sırasında görseli bu URL'den
-- indirir (Adım 8). Yazma kapalıdır — hiçbir storage policy tanımlanmaz;
-- yükleme yalnızca server tarafındaki service role ile yapılır.
insert into storage.buckets (id, name, public)
values ('content-images', 'content-images', true)
on conflict (id) do nothing;

-- ── Seed: İlk içerik taslağı (Bölüm G) ──
-- Sistem ilk açıldığında dashboard'da onay bekleyen içerik olarak görünür.
-- "where not exists" sayesinde şema tekrar çalıştırılsa bile bir kez eklenir.
insert into content_drafts
  (content_type, goal, visual_text, visual_subtext, caption, cta, hashtags, story_texts, topic_id, status)
select
  'post',
  'DM''den demo talebi almak',
  'Rent a car araç takibi hâlâ Excel''de mi?',
  'Araç, müşteri, ödeme ve sözleşme tek panelde.',
  'Rent a car işletmelerinde en büyük sorun çoğu zaman araç sayısı değil, takip düzenidir.

Hangi araç kirada?
Hangi müşterinin ödemesi kaldı?
Sözleşme nerede?
Kapora alındı mı?

Bunlar defter, Excel ve WhatsApp arasında dağılınca iş büyüdükçe takip zorlaşır.

Araç Takip Paneli ile araç, müşteri, ödeme ve sözleşme bilgilerini tek panelde toplayabilirsiniz.

Demo görmek için DM''den ''PANEL'' yazabilirsiniz.',
  'Demo için DM''den PANEL yazın.',
  array['#rentacar','#rentacartakip','#araçkiralama','#filotakip','#rentacarpanel','#araçtakip','#işletmeyönetimi','#bolurentacar'],
  array[
    'Hangi araç kirada, hangisi müsait? Tek ekranda görün.',
    'Ödemesi kalan müşteri unutulmasın. Demo için DM: PANEL'
  ],
  'excel-karisikligi',
  'draft'
where not exists (select 1 from content_drafts);

-- Kurulum logu
insert into agent_logs (action, message, metadata)
select 'setup', 'Şema kuruldu ve ilk içerik taslağı oluşturuldu', '{"step": 2}'::jsonb
where not exists (select 1 from agent_logs where action = 'setup');
