# Test ve Yayına Alma Kontrolü

## Otomatik kontroller

Node.js 20.9 veya üzeri gerekir.

```bash
npm install
npm run typecheck
npm run build
```

Bu üç komut TypeScript tiplerini, Next.js üretim derlemesini, FFmpeg importunu ve bütün API route'larının paketlenmesini kontrol eder.

## Yerel smoke test

`.env.local` içinde Supabase bilgileri tanımlı olmalıdır.

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run smoke
```

Smoke test gerçek Instagram yayını yapmadan şunları denetler:

- olmayan taslak 404;
- eksik `draftId` 400;
- onaysız taslak 403;
- reddedilen taslak 403;
- paylaşılmış taslak tekrar engeli;
- yasaklı pazarlama ifadeleri;
- formatına göre eksik medya engeli.

## Elle medya testi

Her format için bir taslak üretin:

1. **Post:** Medyayı Hazırla → tek kare PNG görünmeli.
2. **Carousel:** 2–10 kare görünmeli; bütün kareler 1:1 olmalı.
3. **Story:** bütün kareler 9:16 görünmeli.
4. **Reels:** MP4 oluşmalı, video oynatılmalı, geçişler ve son CTA görünmeli.

Bir taslağın metnini düzenleyin. Eski görsel/video kaybolmalı ve içerik yeniden onay beklemelidir.

## Meta test hesabıyla uçtan uca kontrol

İlk gerçek denemeyi ana satış hesabı yerine profesyonel bir test hesabında yapın.

- Ayarlar ekranında Meta Graph API **Hazır** görünmeli.
- Post tek gönderi olarak yayınlanmalı.
- Carousel tek gönderide doğru sırada görünmeli.
- Story kareleri sırayla yayınlanmalı.
- Reels video olarak yayınlanmalı ve ana akışta görünmeli.
- Her başarı `Yayın Kayıtları` ekranına kaydolmalı.
- Aynı taslağın ikinci yayını 409 ile engellenmeli.

## Çok kareli Story hata testi

Bu test yalnızca test hesabında yapılmalıdır:

1. Üç kareli Story başlatın.
2. İlk kare yayınlandıktan sonra bağlantıyı bilinçli kesin.
3. Taslak `Başarısız`, yayın kaydı `partial` olmalı.
4. Bağlantıyı düzeltip yeniden onaylayın.
5. Sistem ilk kareyi tekrarlamadan ikinci kareden devam etmelidir.

İlk yayın isteğinin sonucu ağ hatası nedeniyle kesinleşmezse kayıt `uncertain`
olmalı; panel otomatik tekrarı kapatıp Instagram hesabını elle kontrol etmenizi
istemelidir.

## Cron kontrolü

Vercel deploy sonrasında:

- `CRON_SECRET` tanımlı olmalı;
- cron isteği yetkisiz başlıkla 401 dönmeli;
- doğru başlıkla ilk çağrı o günün taslağını oluşturmalı;
- aynı gün ikinci çağrı `skipped: true` dönmeli;
- yedi bekleyen taslak varken yeni taslak oluşturmamalı.

## Yayın öncesi son kontrol

- [ ] `PANEL_ADMIN_PASSWORD` uzun ve benzersiz.
- [ ] `.env.local` ve tokenlar Git'e girmiyor.
- [ ] `supabase/migration-social-formats.sql` eski veritabanında çalıştırıldı.
- [ ] `content-images` ve `content-videos` public okunabiliyor.
- [ ] Meta tokenında içerik yayın izni var.
- [ ] Gerçek ürün dışındaki özellikler içeriklerde yer almıyor.
- [ ] Reels videosu ve carousel kareleri telefonda okunabiliyor.
