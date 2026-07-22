// ─────────────────────────────────────────────────────────────
// Dil kuralları (Adım 4)
//
// Marka dili: sade, net, abartısız. Aşağıdaki ifadeler içerikte
// GEÇEMEZ. Üretim sırasında her metin bu listeden geçirilir;
// eşleşme olursa taslak OLUŞTURULMAZ ve loglanır.
// Yeni yasaklı ifade eklemek için listeye satır eklemeniz yeterli.
// ─────────────────────────────────────────────────────────────

export const FORBIDDEN_PHRASES: string[] = [
  // Spec'te açıkça yasaklananlar
  "Türkiye'nin en iyi",
  'rakipsiz',
  '10 kat',
  'devrim niteliğinde',
  // Aynı ruhta abartılı ifadeler
  'devrim yarat',
  'kusursuz',
  'mükemmel',
  'benzersiz',
  'efsane',
  'inanılmaz',
  'muhteşem',
  'kaçırmayın',
  'hayatınızı değiştir',
  '%100',
  'sınırsız',
  'garantili',
  // Gereksiz İngilizce SaaS dili
  'game changer',
  'game-changer',
  'all-in-one',
  'seamless',
  'boost',
  'disrupt',
  'next-gen',
  'revolutionize',
  'empower',
  'leverage',
  'synergy',
  'scale-up',
  // Panelde bulunmayan özelliklerin ürün vaadine dönüşmesini engeller
  'otomatik whatsapp',
  'whatsapp entegrasyonu',
  'e-fatura',
  'e-arşiv',
  'online ödeme',
  'muhasebe entegrasyonu',
  'bakım uyarısı',
  'bakım hatırlat',
  'gps',
  'mobil uygulama',
  'otomatik bildirim',
];

/**
 * Verilen metinlerde yasaklı ifade arar.
 * Bulursa ifadenin kendisini, bulamazsa null döner.
 * Karşılaştırma Türkçe'ye duyarlı küçük harfle yapılır (İ/i, I/ı).
 */
export function findForbiddenPhrase(
  texts: Array<string | null | undefined>
): string | null {
  const haystack = texts.filter(Boolean).join(' ').toLocaleLowerCase('tr');
  for (const phrase of FORBIDDEN_PHRASES) {
    if (haystack.includes(phrase.toLocaleLowerCase('tr'))) return phrase;
  }
  return null;
}
