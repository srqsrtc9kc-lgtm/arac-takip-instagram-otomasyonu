# Araç Takip Paneli · Instagram Otomasyonu

Rent a car işletmelerine satılan Araç Takip Paneli için Instagram içerik operasyonu:

`taslak üret → görsel/video hazırla → panelde ön izlet → açık onay al → Meta API ile yayınla`

Sistem post, carousel, çok kareli Story ve gerçek MP4 Reels üretir. Hiçbir içerik kullanıcı onayı olmadan yayınlanmaz.

## Ne üretir?

| Format | Otomatik çıktı | Instagram yayını |
|---|---|---|
| Post / demo | 1080×1080 PNG + caption | Tek görsel gönderi |
| Carousel | 2–10 adet 1080×1080 PNG | Tek kaydırmalı gönderi |
| Story | 1–5 adet 1080×1920 PNG | Kareler sırayla Story olarak |
| Reels | 1080×1920 H.264/AAC MP4 + kapak | Reels, ana akışta da gösterilir |

Reels videosu sahne metinlerinden otomatik oluşturulur. Her sahnede hafif yakınlaşma, sahneler arasında yumuşak geçiş vardır. İlk sürüm metin tabanlı hareketli marka videosudur; gerçek panel ekran kaydı içermez.

## Haftalık ritim

Vercel Cron her gün saat **08:00 Türkiye saati** için bir taslak üretir:

| Gün | Format |
|---|---|
| Pazartesi | Carousel |
| Salı | Post |
| Çarşamba | Reels |
| Perşembe | Story |
| Cuma | Reels |
| Cumartesi | Story |
| Pazar | Story |

Taslaklar onay kuyruğunda birikir. Aynı gün ikinci cron taslağı oluşmaz; kuyruk yedi bekleyen içeriğe ulaşırsa üretim durur. Kullanıcı içerikleri tek tek görür, düzenler, reddeder veya onaylayıp yayınlar.

## Gerçek ürün sınırı

İçerik üretici yalnızca panelde bulunan şu özellikleri tanıtır:

- araç takibi;
- müşteri kaydı;
- rezervasyon;
- kapora, ödenen ve kalan ödeme;
- teslim kontrol notları;
- A4 sözleşme çıktısı.

GPS, otomatik WhatsApp, e-fatura, online ödeme, muhasebe entegrasyonu, bakım uyarısı veya mobil uygulama varmış gibi içerik üretmemesi için AI talimatı ve hazır konu havuzu sınırlandırılmıştır.

## Güvenlik ve onay kuralı

- Tüm panel ve yazma API'leri `PANEL_ADMIN_USER` + `PANEL_ADMIN_PASSWORD` ile korunur.
- Yeni üretilen her içerik `draft` durumundadır.
- Medya yenilenirse önceki onay sıfırlanır.
- Backend, `approved` olmayan taslağı 403 ile reddeder.
- `published_posts.draft_id` tektir; aynı taslak ikinci kez yayınlanamaz.
- Çok kareli Story yarıda kesilirse yayınlanan kareler kaydedilir; tekrar denemede kaldığı kareden devam eder.
- Token, şifre ve service-role anahtarı frontend'e veya loglara yazılmaz.
- Yalnızca resmi Meta Graph API kullanılır; tarayıcı/şifre botu yoktur.

## Kurulum

### 1. Paketler

Node.js 20.9 veya üzeri gerekir.

```bash
npm install
```

### 2. Supabase

Yeni kurulumda Supabase → SQL Editor içinde `supabase/schema.sql` dosyasını çalıştırın.

Eski sürüm kuruluysa yalnızca şunu çalıştırın:

```text
supabase/migration-social-formats.sql
```

Bu işlem yeni alanları ve public `content-videos` bucket'ını oluşturur. `content-images` ve `content-videos` public okunur; yazma yalnızca server-side service role ile yapılır.

### 3. Ortam değişkenleri

```bash
cp .env.example .env.local
```

Zorunlu temel alanlar:

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PANEL_ADMIN_USER=admin
PANEL_ADMIN_PASSWORD=uzun-ve-benzersiz-bir-sifre
```

Özgün metin üretimi için isteğe bağlı:

```text
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5
```

Anahtar boşsa sistem hazır konu havuzuyla yine çalışır.

### 4. Meta / Instagram bağlantısı

Instagram hesabı profesyonel hesap olmalı ve bir Facebook Sayfası'na bağlı olmalıdır. Meta uygulamasının tokenında en az `instagram_basic`, `instagram_content_publish` ve gerekli sayfa okuma izinleri bulunmalıdır.

```text
META_ACCESS_TOKEN=
IG_USER_ID=
META_GRAPH_VERSION=v25.0
```

Uygulama geliştirme modundayken yalnızca uygulamaya yönetici/test kullanıcısı olarak eklenen hesaplarda yayın yapılabilir. Başka müşterilerin hesaplarını bağlamak için Meta App Review gerekir.

### 5. Yerel çalıştırma

```bash
npm run dev
```

`http://localhost:3000/dashboard` adresini açın. Geliştirme ortamında panel giriş değişkenleri boşsa proxy yerel çalışmayı engellemez; Vercel üretim ortamında ikisi de zorunludur.

## Vercel'e alma ve günlük otomasyon

1. Projeyi GitHub'a gönderin ve Vercel'e bağlayın.
2. `.env.example` içindeki gerekli değişkenleri Vercel Project Settings → Environment Variables alanına ekleyin.
3. Güçlü bir `CRON_SECRET` oluşturun.
4. Deploy edin.

`vercel.json`, `/api/generate` yolunu her gün `05:00 UTC` saatinde çağırır; bu Türkiye'de 08:00'dır. Vercel, `CRON_SECRET` varsa isteğe `Authorization: Bearer ...` başlığı ekler. Eski `AGENT_SECRET` değişkeni geriye dönük uyumluluk için desteklenir.

## Kullanım

1. Dashboard'da otomatik taslağı açın veya manuel içerik üretin.
2. Metinleri kontrol edin; gerekiyorsa düzenleyin.
3. **Medyayı Hazırla** butonuna basın.
4. Carousel/Story için bütün kareleri, Reels için videonun tamamını kontrol edin.
5. **Onayla ve Paylaş** butonuna basın ve ikinci onayı verin.
6. Yayın sonucu `Yayın Kayıtları` ekranına kaydolur.

## Komutlar

```bash
npm run typecheck
npm run build
npm run dev
npm run smoke
```

`npm run smoke`, çalışan yerel sunucuda onaysız yayın, eksik medya ve çift paylaşım engellerini gerçek Instagram yayını yapmadan sınar.

## Ana dosyalar

```text
app/api/generate/route.ts       günlük/manuel taslak üretimi
app/api/image/route.ts          PNG ve MP4 medya üretimi
app/api/publish/route.ts        onay, kilit, hata ve yayın orkestrasyonu
lib/content/ai.ts               özgün metin üretimi ve ürün sınırları
lib/content/topics.ts           hazır konu havuzu
lib/video/render.ts             FFmpeg Reels üretimi
lib/publish/meta.ts             post/carousel/Story/Reels Meta akışları
supabase/schema.sql             tam veritabanı şeması
vercel.json                     günlük cron planı
proxy.ts                        panel giriş ve aynı-origin koruması
```

## Bilinen sınırlar

- Otomatik Reels, hareketli metin kartlarından oluşur; gerçek panel ekranlarını gösteren demo videosu için ayrıca ekran kayıtlarının sisteme girdi olarak eklenmesi gerekir.
- Video sessiz AAC kanalıyla üretilir. Instagram müzik kütüphanesinden parça seçme bu otomatik yayın akışında yapılmaz.
- Meta tokenının süresi dolarsa yayın durur; token yenilenip Vercel değişkeni güncellenmelidir.
- Uçtan uca gerçek Instagram testi, Meta hesabı ve token olmadan yerel ortamda yapılamaz.
