# Araç Takip Paneli · Instagram Agent

"Araç Takip Paneli" markası için Instagram operasyon paneli:
içerik üretir → ön izleme gösterir → **açık onay bekler** → onaydan sonra paylaşır → kaydını tutar.

## Kritik Kural

> **Paylaşım, sadece kullanıcı ön izlemeyi gördükten ve açıkça onay verdikten sonra yapılır.**

Bu kural iki katmanda uygulanır:

1. **Frontend:** "Onayla ve Paylaş" butonuna basılmadan hiçbir paylaşım isteği gönderilmez. Butona basınca ek bir onay penceresi (confirm) daha çıkar.
2. **Backend:** `/api/publish` endpoint'i, taslağın durumu `approved` değilse **403** döner ve `agent_logs` tablosuna `publish_blocked` kaydı bırakır. Frontend atlansa bile paylaşım yapılamaz.

Ek korumalar:

- `published_posts.draft_id` **UNIQUE** → aynı içerik veritabanı seviyesinde iki kez paylaşılamaz.
- Onaylı bir taslak **düzenlenirse** durumu otomatik olarak `draft`'a döner → yeniden onay gerekir (onay, ekranda görülen içeriğe aittir).
- Başarısız paylaşım otomatik tekrar denenmez; hata kullanıcıya gösterilir.

## Adım Durumu

| # | Adım | Durum |
|---|------|-------|
| 1 | Proje dosya yapısı | ✅ Tamam |
| 2 | Supabase tablo SQL'leri | ✅ Tamam (ilk taslak seed dahil) |
| 3 | Dashboard sayfası | ✅ Tamam (ön izleme + onay/reddet/düzenle) |
| 4 | İçerik üretim fonksiyonu | ✅ Tamam (konu havuzu + panel butonu + cron hazır) |
| 5 | Ön izleme ekranı | ✅ Tamam (görsel üretildiyse gerçek PNG gösterilir) |
| 6 | Onay / reddet / düzenle sistemi | ✅ Tamam (frontend + backend) |
| 7 | Görsel üretimi | ✅ Tamam (satori + resvg, Supabase Storage'a yükleme) |
| 8 | Meta Graph API paylaşımı | ✅ Tamam (container → bekle → publish, kayıt + kilit) |
| 9 | Playwright fallback | ✅ Tamam (opt-in, ayrı dosya, yeniden onay + uyarılar) |
| 10 | Loglama ve hata yönetimi | ✅ Temel yapı hazır (`agent_logs` + `lib/log.ts`) |
| 11 | Test komutları | ✅ Tamam (`npm run smoke` + TEST.md rehberi) |
| 12 | Kurulum adımları | ✅ Aşağıda |

## Kurulum (4 adım)

1. **Paketleri kur:**
   ```bash
   npm install
   ```
2. **Supabase tablolarını oluştur:**
   Supabase projenizde **SQL Editor**'ü açın, `supabase/schema.sql` dosyasının içeriğini yapıştırıp çalıştırın.
   (Tekrar çalıştırmak güvenlidir; ilk taslak zaten varsa yeniden eklenmez.)
   > **Sıfırdan kuruyorsanız** güncel `schema.sql` tek başına yeterlidir (görsel bucket'ı dahil).
   > **Şemayı önceki adımlarda kurduysanız** ek olarak şunları bir kez çalıştırın:
   > `supabase/migration-adim4.sql` (topic_id) ve `supabase/migration-adim7.sql` (görsel bucket'ı).
3. **Ortam değişkenlerini ayarla:**
   ```bash
   cp .env.example .env.local
   ```
   Şu an sadece şu ikisi zorunlu (Supabase → Project Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Çalıştır:**
   ```bash
   npm run dev
   ```
   `http://localhost:3000` → otomatik olarak `/dashboard`'a yönlenir ve ilk taslak ön izlemede görünür.

## Güvenlik

- `.env`, `.env.local`, `.env.production`, `playwright/.auth`, `storageState.json` → `.gitignore`'da. **Asla commit edilmez.**
- `SUPABASE_SERVICE_ROLE_KEY` yalnızca server tarafında kullanılır (`lib/supabase/server.ts`, `server-only` importlu → yanlışlıkla client'a sızarsa build hata verir).
- Üç tabloda da **RLS açık, policy yok** → anon anahtarla erişim kapalı; tüm erişim server üzerinden service role ile.
- `/settings` sayfası değişkenlerin **sadece dolu/boş** olduğunu gösterir; değerlerin kendisi asla ekrana veya loga yazılmaz.
- Instagram şifresi hiçbir dosyada, logda, terminal çıktısında veya frontend'de görünmez; yalnızca server-side (Adım 9) kullanılacak.
- ⚠️ Playwright modu Instagram kullanım koşullarına aykırıdır ve hesap kısıtlaması riski taşır; arayüz değişirse bozulabilir. Mümkünse Meta Graph API kullanılmalıdır.

## Klasör Yapısı

```
arac-takip-ig-agent/
├── app/
│   ├── api/
│   │   ├── drafts/route.ts          # GET: taslak listesi
│   │   ├── drafts/[id]/route.ts     # PATCH: onayla / reddet / düzenle
│   │   ├── generate/route.ts        # POST: içerik üret (GET: cron, AGENT_SECRET korumalı)
│   │   ├── image/route.ts           # POST: görsel üret + Storage'a yükle
│   │   └── publish/route.ts         # POST: paylaşım (approved değilse 403)
│   ├── dashboard/page.tsx           # Ön izleme + onay/reddet/düzenle + içerik ve görsel üretimi
│   ├── drafts/page.tsx              # Tüm taslaklar
│   ├── published/page.tsx           # Paylaşım kayıtları
│   ├── settings/page.tsx            # Bağlantı durumu (değer göstermez)
│   ├── layout.tsx / page.tsx / globals.css
├── assets/fonts/                    # DejaVu Sans (Türkçe karakter desteği, lisansıyla)
├── lib/
│   ├── content/topics.ts            # Konu havuzu (13 hazır içerik)
│   ├── content/generator.ts         # Tür ritmi + konu seçimi + taslak kaydı
│   ├── content/language.ts          # Yasaklı ifade listesi ve denetimi
│   ├── image/template.ts            # Marka görsel şablonu (satori düğüm ağacı)
│   ├── image/render.ts              # satori + resvg ile PNG üretimi (server-only)
│   ├── publish/meta.ts              # Meta Graph API paylaşımı (Mod 1, server-only)
│   ├── publish/playwright.ts        # Playwright fallback (Mod 2, opt-in, server-only)
│   ├── supabase/server.ts           # server-only admin client
│   ├── types.ts / labels.ts / log.ts
├── supabase/schema.sql              # Tablolar + RLS + bucket + ilk taslak seed
├── supabase/migration-adim4.sql     # Eski kurulumlar için topic_id migration'ı
├── supabase/migration-adim7.sql     # Eski kurulumlar için görsel bucket migration'ı
├── scripts/smoke-test.mjs           # Kritik kural otomatik testi (npm run smoke)
├── TEST.md                          # Test ve kurulum rehberi (Türkçe)
├── .env.example / .gitignore
└── package.json vb. yapılandırma dosyaları
```

## İçerik Üretimi (Adım 4)

### Yapay zekâ ile özgün üretim (önerilen)

`.env.local` dosyasına **`ANTHROPIC_API_KEY`** girildiğinde, her "İçerik Üret" basışında metinler **Claude tarafından özgün olarak yazılır** (model: `claude-sonnet-4-6`). Anahtar almak için: [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key (kullanım başına ücretlendirilir; bir gönderi metni yaklaşık kuruşlar mertebesindedir).

Güvenceler:

- Claude'a marka bilgisi, hedef kitle ve **tüm dil kuralları** (yasaklı ifadeler dahil) talimat olarak verilir; son üretilen başlıklar gösterilir ki **konular tekrarlanmasın**.
- Üretilen her metin kayıttan önce **yasaklı ifade denetiminden** geçer; ihlal varsa Claude'a hatası söylenip bir kez daha denenir.
- **CTA ve hashtag seti sabittir** — Claude'un çıktısına bakılmaksızın kod tarafından yazılır.
- Claude başarısız olursa (anahtar yok/limit/ağ), sistem **hazır konu havuzuna otomatik düşer** ve panel mesajında bunu belirtir; panel asla kırılmaz.
- Kritik kural değişmez: AI yalnızca **taslak** üretir; onaysız paylaşım yok. Anahtar hiçbir logda görünmez.

### Hazır konu havuzu (yedek)

İçerik, `lib/content/topics.ts` içindeki **konu havuzundan** üretilir. Havuzda 13 hazır konu var: 8 post, 2 story, 2 reels, 1 demo. Tümü spec'teki dil kurallarına göre yazıldı — sade, abartısız, soru odaklı; yasaklı ifadeler yok, CTA her zaman "Demo için DM'den PANEL yazın."

**Nasıl çalışır:**

- Dashboard'da bekleyen taslak yokken **"İçerik Üret"** kartı görünür. Tür seçin (Otomatik / Post / Story / Reels / Demo) ve üretin; taslak onayınız için ön izlemeye düşer.
- **Otomatik** mod haftalık ritmi izler: Pzt–Sal–Per post, Çar reels, Cum demo, Cmt–Paz story.
- Kullanılan konular `topic_id` ile izlenir; havuz bitmeden aynı konu tekrar gelmez. Havuz biterse en uzun süredir kullanılmayan konu döner.
- **Dil denetimi:** üretimden önce tüm metinler `lib/content/language.ts` içindeki yasaklı ifade listesinden geçirilir ("rakipsiz", "10 kat", İngilizce SaaS klişeleri vb.). İhlal varsa taslak oluşturulmaz ve `agent_logs`'a yazılır.
- Bekleyen bir taslak (onay bekleyen / onaylı / başarısız) varken yeni üretim engellenir — içerik birikmez, akış tek tek ilerler.
- Yeni konu eklemek için `topics.ts`'e aynı yapıda bir kayıt eklemek yeterli.

**Zamanlanmış üretim (isteğe bağlı):** `GET /api/generate`, yalnızca `Authorization: Bearer <AGENT_SECRET>` başlığıyla çalışır ve "Otomatik" modda üretir. `AGENT_SECRET` boşsa bu yol kapalıdır. Vercel Cron ile günlük tetiklenebilir; bekleyen taslak varsa üretim sessizce atlanır.

## Görsel Üretimi (Adım 7)

**Görsel varyantları:** her taslak, kimliğinden türetilen deterministik bir görünüm alır — 4 renk paleti (mavi, camgöbeği, çivit, çelik) × 2 yerleşim = 8 varyant. Aynı taslağın görseli hiç değişmez (onayladığınız görsel paylaşılır), ama akıştaki farklı gönderiler tekdüze görünmez.

Taslak metinlerinden (`visual_text`, `visual_subtext`, `cta`) marka şablonuyla otomatik PNG üretilir: koyu zemin, mavi vurgu çizgisi, CTA rozeti — panelin görsel diliyle aynı. Post/demo için 1080×1080, story için 1080×1920, reels için 1080×1920 **kapak** görseli (videonun kendisi sahne planına göre sizde çekilir).

**Nasıl çalışır:**

- Ön izlemedeki **"Görseli Oluştur"** butonu `/api/image`'ı çağırır: satori metni dizer, resvg PNG'ye çevirir, dosya Supabase Storage'daki public `content-images` bucket'ına yüklenir ve URL taslağa yazılır.
- Görsel üretildikten sonra ön izlemede temsili kart yerine **paylaşılacak PNG'nin kendisi** gösterilir — onay tam olarak göreceğiniz görsele verilir.
- **Taslak düzenlenirse görsel otomatik sıfırlanır**: metinle uyuşmayan eski bir görselin paylaşılması imkânsızdır. Kaydettikten sonra "Görseli Oluştur"a yeniden basmanız yeterli.
- Görsel oluşturulmadan **"Onayla ve Paylaş" çalışmaz** (reels hariç — orada video sizde): onay, ekranda gördüğünüz gerçek görsele verilir.
- Türkçe karakterler için DejaVu Sans fontu projeye gömülüdür (`assets/fonts/`, lisansı yanında) — lokalde ve Vercel'de birebir aynı çıktı üretilir, sunucu fontlarına bağımlılık yoktur.
- Public URL, Adım 8'de Meta Graph API'nin görseli çektiği adres olacak. Bucket public olsa da **yazma kapalıdır**; yükleme yalnızca server tarafındaki service role ile yapılır.

## Paylaşım (Adım 8 — Meta Graph API)

"Onayla ve Paylaş" artık gerçek paylaşım yapar (Meta bilgileri doluysa). Akış: onay ve görsel kontrolleri → paylaşım kilidi → media container oluştur → Meta görseli işleyene kadar bekle → `media_publish` → `published_posts` kaydı + taslak `published`.

**Meta tarafında bir kez yapılacaklar:** Instagram hesabını profesyonel hesaba çevirin ve bir Facebook Sayfası'na bağlayın; developers.facebook.com üzerinde bir uygulama açıp `instagram_content_publish`, `instagram_basic` ve `pages_read_engagement` izinli **uzun ömürlü** bir token alın; dört değişkeni `.env.local`'e yazın. Ayarlar sayfası hangi değerin eksik olduğunu gösterir.

**Davranış kuralları:**

- **Story** görsel olarak paylaşılır (caption'sız; ilk kare metni). **Post/demo** caption + hashtag'lerle paylaşılır (hashtag'ler caption sonuna eklenir).
- **Reels API ile paylaşılmaz** (video gerekir) — panel bunu açıkça söyler; videoyu sahne planına göre çekip uygulamadan paylaşırsınız.
- **Başarısız paylaşım otomatik tekrar denenmez.** Taslak `Başarısız` olur, hata Türkçe ipucuyla ekranda görünür (token süresi, izin, görsel erişimi, API limiti ayrı ayrı tanınır); sorunu giderince "Paylaşımı Tekrar Dene" dersiniz.
- **Çift paylaşım üç katmanda imkânsız:** veritabanı UNIQUE kısıtı + Meta'ya gitmeden önce atılan paylaşım kilidi (eşzamanlı ikinci istek Instagram'a hiç ulaşmaz) + paylaşılmış taslağın değiştirilememesi. Yarım kalmış eski bir kilit (ör. sunucu kesintisi) 3 dakika sonra otomatik temizlenir.
- Token hiçbir logda, hata mesajında veya ekranda görünmez.

**İlk deneme önerisi:** mümkünse önce bir test Instagram hesabıyla uçtan uca deneyin; Instagram API ile günde en fazla ~50 içerik yayınlamaya izin verir (bu panelin ritmi için fazlasıyla yeterli).

## Playwright Fallback (Adım 9 — Mod 2, önerilmez)

Meta API'nin hiç kurulamadığı durumlar için son çare: `lib/publish/playwright.ts` tarayıcıyı otomatikleştirerek Instagram'a girer. **Varsayılan olarak kapalıdır** ve bilinçli devreye alma ister.

⚠️ **Bu yöntem Instagram Kullanım Koşulları'na aykırıdır**, hesap kısıtlama riski taşır ve Instagram arayüzü değiştiğinde bozulur. Mümkünse her zaman Mod 1 (Meta API) kullanın.

**Açmak için (üç şart birden):**

1. `npm i -D playwright && npx playwright install chromium`
2. `.env.local` → `INSTAGRAM_USERNAME`, `INSTAGRAM_PASSWORD`
3. `.env.local` → `ENABLE_PLAYWRIGHT_FALLBACK=true`

Üçü tamam değilse modül nazikçe "kapalı" döner ve Mod 1 hiç etkilenmez. Paylaşım sırasında Meta bilgileri doluysa **her zaman önce Mod 1** seçilir; Mod 2 yalnızca Meta yokken ve bu bayrak açıkken devreye girer.

**Güvenlik ve kritik kural (Mod 2'de de geçerli):**

- **Şifre asla sızmaz:** hiçbir log, hata mesajı veya yanıtta yer almaz; tüm metinler kullanıcı adı/şifre süzgecinden geçer.
- **Oturum güvenli saklanır:** giriş sonrası cookie/storage `playwright/.auth/` altına yazılır (`.gitignore`'da → repoya girmez). Sonraki paylaşımlarda önce bu oturum denenir; şifre yalnızca oturum yoksa kullanılır → şifre kullanımı en aza iner.
- **Yayın öncesi yeniden onay:** "Paylaş" adımına geçmeden hemen önce taslağın hâlâ `approved` olduğu veritabanından teyit edilir. Bu ara pencerede içerik reddedildi/düzenlendiyse paylaşım **son anda iptal edilir** — kritik kuralın Mod 2 aynası.
- **Aynı kilit ve çift-paylaşım korumaları** Mod 1'le aynıdır (kayıt `publish_mode: 'playwright'` olur).

**Önemli sınır:** Instagram'ın gönderi-oluşturma arayüzü (dosya yükleme, kırpma, "İleri" adımları) sürekli değiştiği için akışın **gönderi kısmı bilinçli olarak iskelet** bırakıldı — giriş, oturum, güvenlik ve yeniden-onay tamdır, ancak modül gönderi adımına gelince sessizce "başarılı" demez; net bir uyarıyla durur. Üretimde bu adımların güncel arayüze göre doldurulup test edilmesi gerekir. Seçiciler `SELECTORS` sabitinde tek yerde toplandı.

## Test (Adım 11)

Kritik kuralın gerçekten uygulandığını doğrulamak için otomatik smoke test ve elle kontrol listesi hazır.

```bash
# 1. terminal
npm run dev
# 2. terminal
npm run smoke
```

`npm run smoke`, çalışan sunucuya karşı **gerçek paylaşım yapmadan** engelleri doğrular: onaysız içeriğin 403 dönmesi, görselsiz onaylı içeriğin reddi, çift/paylaşılmış içeriğin engellenmesi, var olmayan taslağın 404'ü ve mevcut taslaklarda yasaklı ifade taraması. Ayrıntılı sıfırdan kurulum, elle uçtan uca kontrol listesi ve Vercel'e yayına alma notları **`TEST.md`** dosyasındadır.

## Tamamlanan Adımlar

Geliştirme sırasının tüm ana adımları hazır: proje iskeleti, Supabase şeması, dashboard, içerik üretimi (konu havuzu + dil denetimi), ön izleme, onay/reddet/düzenle, görsel üretimi (satori + resvg), Meta Graph API paylaşımı (Mod 1) ve Playwright fallback (Mod 2, opt-in), loglama/hata yönetimi, test komutları ve kurulum.

İsterseniz sıradaki iyileştirmeler: Playwright gönderi-akışının güncel Instagram arayüzüne göre doldurulup test edilmesi (Adım 9 notu), çok kareli story desteği, veya `/published` sayfasına Instagram gönderi bağlantılarının eklenmesi.
