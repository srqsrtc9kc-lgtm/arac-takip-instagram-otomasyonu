# Test ve Kurulum Rehberi (Adım 11)

Bu rehber, paneli sıfırdan çalıştırmanız ve **kritik kuralın** (onay olmadan paylaşım yok) gerçekten uygulandığını kendi gözünüzle doğrulamanız içindir.

---

## 1. Sıfırdan Kurulum (ilk kez)

```bash
# 1) Paketleri kur
npm install

# 2) Supabase → SQL Editor → supabase/schema.sql içeriğini yapıştır → Run
#    (Şemayı önceki adımlarda kurduysanız migration-adim4.sql ve
#     migration-adim7.sql dosyalarını da bir kez çalıştırın.)

# 3) Ortam değişkenleri
cp .env.example .env.local
#    Şu ikisi zorunlu:
#      NEXT_PUBLIC_SUPABASE_URL
#      SUPABASE_SERVICE_ROLE_KEY
#    (Supabase → Project Settings → API'den alınır.)

# 4) Çalıştır
npm run dev
```

Tarayıcıda `http://localhost:3000` → otomatik olarak `/dashboard`. İlk taslak ön izlemede görünmeli.

---

## 2. Otomatik Test (smoke test)

Kritik kuralın engellerini otomatik doğrular. Gerçek paylaşım yapmaz, veritabanına yazmaz.

```bash
# 1. terminal
npm run dev

# 2. terminal
npm run smoke
```

Beklenen çıktı (özet):

```
  ✓ /api/drafts erişilebilir (N taslak)
  ✓ Var olmayan taslağın paylaşımı reddedilir (404)
  ✓ draftId olmadan istek reddedilir (400)
  ✓ Onaysız ('draft') içerik paylaşımı engellenir (403)
  ✓ Mevcut taslaklarda yasaklı ifade yok
  ...
  Sonuç: N geçti, 0 kaldı
```

Testin bazı satırları uygun taslak yoksa atlanır (ör. "reddedilmiş içerik" testi için önce bir taslağı reddetmeniz gerekir). Bu normaldir.

> Farklı bir adres için: `BASE_URL=http://localhost:3001 npm run smoke`

---

## 3. Elle Kontrol Listesi (uçtan uca)

Aşağıdaki adımları panelde sırayla yapıp beklenen davranışı doğrulayın.

### A. İçerik üretimi
- [ ] Panelde bekleyen taslak yokken **"İçerik Üret"** kartı görünür.
- [ ] Tür seçip üretince yeni taslak ön izlemeye düşer, durumu **Onay Bekliyor**.
- [ ] Aynı anda ikinci içerik üretmeye çalışınca "bekleyen taslak var" uyarısı gelir (içerik birikmez).

### B. Kritik kural — onay
- [ ] Görsel oluşturmadan **"Onayla ve Paylaş"** denenince "önce görseli oluşturun" uyarısı çıkar (reels hariç).
- [ ] **"Görseli Oluştur"** sonrası ön izlemede temsili kart yerine gerçek PNG görünür.
- [ ] **"Onayla ve Paylaş"** ek bir onay penceresi (confirm) sorar; iptal edilince hiçbir şey olmaz.

### C. Düzenleme yeniden onay ister
- [ ] Bir taslağı **Düzenle** → kaydet. Durum tekrar **Onay Bekliyor** olur.
- [ ] Görsel varsa, düzenleme sonrası görsel sıfırlanır (eski görsel paylaşılamaz).

### D. Reddetme
- [ ] **Reddet / Yeniden Üret** sonrası taslak **Reddedildi** olur, panel yeniden üretim sunar.

### E. Paylaşım modu (Ayarlar sayfası)
- [ ] `/settings` yalnızca değişkenlerin **dolu/boş** durumunu gösterir; hiçbir değer görünmez.
- [ ] Meta bilgileri boşken "Onayla ve Paylaş" → içerik onaylı bekler, "mod yapılandırılmadı" mesajı gelir (paylaşım yapılmaz).

### F. Gerçek paylaşım (yalnızca Meta API kuruluysa)
- [ ] `.env.local`'e dört Meta değişkenini girip sunucuyu yeniden başlatın.
- [ ] Ayarlar'da "Aktif paylaşım modu: Meta Graph API (Mod 1)" görünür.
- [ ] Bir içeriği onaylayıp paylaşın → Instagram'da yayınlanır, `/published`'da kayıt görünür, taslak **Paylaşıldı** olur.
- [ ] Aynı içeriği tekrar paylaşmayı deneyin → "zaten paylaşılmış" (engellenir).

> İlk gerçek paylaşımı mümkünse bir **test Instagram hesabıyla** yapın.

---

## 4. Sık Karşılaşılan Durumlar

| Belirti | Olası neden / çözüm |
|---|---|
| `Supabase ortam değişkenleri eksik` | `.env.local`'de URL veya service role key boş. Doldurup sunucuyu yeniden başlatın. |
| Görsel oluşturmada `bucket bulunamadı` | `supabase/migration-adim7.sql` çalıştırılmamış. SQL Editor'de bir kez çalıştırın. |
| Paylaşımda `Erişim tokenı geçersiz` | Meta tokenı süresi dolmuş. Uzun ömürlü token alıp `META_ACCESS_TOKEN`'ı güncelleyin. |
| Paylaşımda `Meta görseli indiremedi` | Görsel URL'i herkese açık değil. `content-images` bucket'ının public olduğundan emin olun. |
| `.env.local` değişikliği etkisiz | Next.js ortam değişkenlerini başlangıçta okur. Sunucuyu durdurup yeniden `npm run dev` yapın. |

---

## 5. Yayına Alma (Vercel) — kısa not

- Projeyi Vercel'e bağlayın; `.env.local`'deki tüm değişkenleri Vercel **Environment Variables** bölümüne aynı adlarla girin (`.env.local` dosyası yüklenmez).
- `SUPABASE_SERVICE_ROLE_KEY` ve Meta tokenı gibi gizli değerleri yalnızca sunucu tarafı (Production/Preview) olarak ekleyin; `NEXT_PUBLIC_` ile başlamayan hiçbir değişken tarayıcıya gitmez.
- Görsel üretimi için font klasörü ve resvg ayarları `next.config.mjs`'de hazırdır; ek yapılandırma gerekmez.
- Zamanlanmış üretim isterseniz `AGENT_SECRET` girip Vercel Cron'u `GET /api/generate`'e `Authorization: Bearer <AGENT_SECRET>` başlığıyla bağlayın.
