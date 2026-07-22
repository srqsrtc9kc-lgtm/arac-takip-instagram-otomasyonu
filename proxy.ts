import type { ContentType } from '../types';

/**
 * KONU HAVUZU — Adım 4
 *
 * Her konu, spec'teki dil kurallarına göre yazılmıştır:
 * - Sade, net, abartısız Türkçe.
 * - Yasaklı ifadeler kullanılmaz ("Türkiye'nin en iyi paneli",
 *   "rakipsiz", "10 kat", "devrim niteliğinde" vb.).
 * - Gereksiz İngilizce SaaS dili yok.
 * - Soru odaklı giriş, sorun → çözüm → CTA akışı.
 * - CTA her zaman: "Demo için DM'den PANEL yazın."
 *
 * Yeni konu eklemek için bu listeye aynı yapıda bir kayıt eklemek yeterlidir.
 */

export interface TopicTemplate {
  id: string; // tekil konu kimliği (tekrarı önlemek için DB'de saklanır)
  type: ContentType;
  goal: string;
  visual_text: string; // görsel üzerindeki ana metin (story'de ilk kare)
  visual_subtext: string | null;
  caption: string | null; // story türünde caption kullanılmaz
  cta: string;
  hashtags: string[];
  story_texts: string[] | null;
  carousel_slides?: string[] | null;
  reels_script: string | null;
  reels_scenes?: string[] | null;
}

export const BASE_HASHTAGS = [
  '#rentacar',
  '#rentacartakip',
  '#araçkiralama',
  '#filotakip',
  '#rentacarpanel',
  '#araçtakip',
  '#işletmeyönetimi',
  '#bolurentacar',
];

const CTA = "Demo için DM'den PANEL yazın.";

export const TOPICS: TopicTemplate[] = [
  // ────────────────────────── POST ──────────────────────────
  {
    // Bu konu, kurulumdaki seed içerikle aynıdır (Bölüm G).
    // Havuzda yer alır ki üretici aynı konuyu hemen tekrar seçmesin.
    id: 'excel-karisikligi',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: "Rent a car araç takibi hâlâ Excel'de mi?",
    visual_subtext: 'Araç, müşteri, ödeme ve sözleşme tek panelde.',
    caption:
      'Rent a car işletmelerinde en büyük sorun çoğu zaman araç sayısı değil, takip düzenidir.\n\n' +
      'Hangi araç kirada?\nHangi müşterinin ödemesi kaldı?\nSözleşme nerede?\nKapora alındı mı?\n\n' +
      'Bunlar defter, Excel ve WhatsApp arasında dağılınca iş büyüdükçe takip zorlaşır.\n\n' +
      'Araç Takip Paneli ile araç, müşteri, ödeme ve sözleşme bilgilerini tek panelde toplayabilirsiniz.\n\n' +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Hangi araç kirada, hangisi müsait? Tek ekranda görün.',
      'Ödemesi kalan müşteri unutulmasın. Demo için DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'odeme-takibi',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: 'Hangi müşterinin ödemesi kaldı?',
    visual_subtext: 'Ödenen ve kalan tutar kiralama kaydında.',
    caption:
      'Kiralama bitti, araç teslim alındı. Peki ödeme tamamlandı mı?\n\n' +
      'İş yoğunlaşınca bekleyen ödemeleri akılda tutmak zorlaşır. Deftere not düşülür, araya başka işler girer, tahsilat gecikir.\n\n' +
      "Araç Takip Paneli'nde kapora, ödenen ve kalan tutar her kiralama kaydında ayrı tutulur.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Bekleyen ödemeleri ezbere mi takip ediyorsunuz?',
      'Ödenen ve kalan tutar kiralama kaydında görünsün. DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'cift-rezervasyon',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: 'Aynı araca iki müşteri yazıldı mı hiç?',
    visual_subtext: 'Rezervasyon kayıtlarını tek panelden kontrol edin.',
    caption:
      'Telefonda bir müşteri, WhatsApp\'ta bir başkası. Araç takvimi tek yerde olmayınca aynı araca iki rezervasyon alınabilir.\n\n' +
      'Sonuç: müşteriye son dakikada araç değişikliği ya da iptal söylemek zorunda kalırsınız.\n\n' +
      "Araç Takip Paneli'nde rezervasyon kayıtlarını tutabilir, yeni kayıt öncesinde mevcut rezervasyonları kontrol edebilirsiniz.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Aracın müsait olup olmadığını nereden kontrol ediyorsunuz?',
      'Rezervasyon kayıtlarını tek panelden kontrol edin. DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'sozlesme-duzeni',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: 'Sözleşmeyi her seferinde baştan mı dolduruyorsunuz?',
    visual_subtext: 'Kiralama bilgileriyle A4 çıktısı alın.',
    caption:
      'Araç, müşteri, tarih ve ödeme bilgilerini sözleşmeye tekrar tekrar yazmak zaman alır. Eksik alan bırakma riski de oluşur.\n\n' +
      "Araç Takip Paneli, kiralama kaydındaki bilgilerle A4 sözleşme çıktısı hazırlar. Kontrol edip yazdırabilirsiniz.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Sözleşme bilgilerini kaç kez tekrar yazıyorsunuz?',
      'Kayıttan A4 sözleşme çıktısı alın. DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'kapora-takibi',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: 'Kapora alındı mı, ne kadar, ne zaman?',
    visual_subtext: 'Kapora bilgisi kiralama kaydında durur.',
    caption:
      'Kaporayı kim aldı, ne kadardı, hangi kiralamaya aitti?\n\n' +
      'Bu sorular akılda ya da deftere düşülen kısa notlarda kalınca teslim gününde karışıklık çıkabilir. Müşteriyle aynı sayfada olmak zorlaşır.\n\n' +
      "Araç Takip Paneli'nde kapora, ödenen ve kalan tutar kiralama kaydında ayrı tutulur.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Kapora bilgilerini nerede tutuyorsunuz?',
      'Kapora ve kalan tutar kiralama kaydında dursun. DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'teslim-kontrol-notlari',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: 'Araç tesliminde hangi notlar alındı?',
    visual_subtext: 'Teslim kontrol bilgileri kiralama kaydında.',
    caption:
      'Araç teslim edilirken kontrol bulguları not alınır. Bu bilgiler yalnızca kâğıtta kaldığında sonraki kontrolde erişmek zorlaşır.\n\n' +
      "Araç Takip Paneli'nde teslim kontrol notları ilgili kiralama kaydına eklenir.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Teslim kontrol notlarını nerede tutuyorsunuz?',
      'Notlar ilgili kiralama kaydında dursun. DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'musteri-gecmisi',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: "Müşteri bilgileri WhatsApp'ta dağılmasın.",
    visual_subtext: 'Müşteri kaydı tek panelde.',
    caption:
      'Müşteri bilgileri WhatsApp yazışmalarında ve defter sayfalarında dağınık durursa her yeni kiralamada yeniden toparlanır.\n\n' +
      "Araç Takip Paneli'nde müşteri kayıtlarını tek yerde tutabilirsiniz.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Müşteri bilgilerini nerede tutuyorsunuz?',
      'Müşteri kayıtları tek panelde dursun. DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'odenen-kalan-ozeti',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: 'Ödenen ve kalan tutarlar birbirine giriyor mu?',
    visual_subtext: 'Her kiralamanın ödeme durumu ayrı görünür.',
    caption:
      'Kapora alındı, sonra bir ödeme daha geldi. Teslim günü geriye ne kaldı?\n\n' +
      'Tutarlar mesajlarda ve defterde ayrı ayrı durursa hesap yeniden yapılır.\n\n' +
      "Araç Takip Paneli'nde kapora, ödenen ve kalan tutar her kiralama kaydında ayrı görünür.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Teslim günü kalan tutarı yeniden mi hesaplıyorsunuz?',
      'Kapora, ödenen ve kalan ayrı görünsün. DM: PANEL',
    ],
    reels_script: null,
  },

  // ───────────────────────── CAROUSEL ────────────────────────
  {
    id: 'carousel-kiralama-akisi',
    type: 'carousel',
    goal: 'Kaydırmalı anlatımla demo talebi almak',
    visual_text: 'Bir kiralamada kaç ayrı yere not alıyorsunuz?',
    visual_subtext: 'Rezervasyondan sözleşmeye tek kayıt.',
    caption:
      'Bir kiralama yalnızca araç tesliminden ibaret değil. Rezervasyon, müşteri, kapora, kalan ödeme, teslim notu ve sözleşme aynı işin parçaları.\n\n' +
      'Bilgiler farklı yerlerde tutulduğunda kontrol zorlaşır. Araç Takip Paneli bu adımları tek kiralama kaydında toplar.\n\n' +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: null,
    carousel_slides: [
      'Bir kiralamada kaç ayrı yere not alıyorsunuz?',
      'Rezervasyon ve araç durumu aynı kayıtta.',
      'Kapora, ödenen ve kalan tutar net.',
      'Teslim kontrol notu ve A4 sözleşme hazır.',
      'Akışı görmek için DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'carousel-kayip-kontrol',
    type: 'carousel',
    goal: 'Takip dağınıklığını görünür kılıp demo talebi almak',
    visual_text: 'Rent a car işletmesinde para nerede kaçar?',
    visual_subtext: 'Üç sık takip hatası.',
    caption:
      'Unutulan kalan ödeme, çakışan rezervasyon ve eksik teslim notu küçük görünür; tekrarlandığında doğrudan para ve zaman kaybettirir.\n\n' +
      'Panelin amacı daha fazla ekran açmak değil, bu kontrolleri tek yerde görünür tutmaktır.\n\n' +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: null,
    carousel_slides: [
      'Rent a car işletmesinde para nerede kaçar?',
      '1. Unutulan kapora veya kalan ödeme.',
      '2. Ayrı yerlerde tutulan rezervasyon kayıtları.',
      '3. Eksik teslim kontrol notu.',
      'Kontroller tek panelde. DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'carousel-panelde-neler-var',
    type: 'carousel',
    goal: 'Ürün özelliklerini sade biçimde gösterip demo talebi almak',
    visual_text: "Araç Takip Paneli'nde neler var?",
    visual_subtext: 'Beş karede kısa ürün turu.',
    caption:
      'Küçük ve orta ölçekli rent a car işletmeleri için hazırlanan panelin temel işi takip düzeni kurmaktır.\n\n' +
      'Araçlar, müşteriler, rezervasyonlar, ödemeler, teslim notları ve A4 sözleşme çıktısı aynı akışın içinde çalışır.\n\n' +
      "Kısa demo için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: null,
    carousel_slides: [
      "Araç Takip Paneli'nde neler var?",
      'Araç: kirada, müsait ve rezervasyon durumu.',
      'Müşteri: iletişim ve kiralama kayıtları.',
      'Ödeme: kapora, ödenen ve kalan tutar.',
      'Teslim notu + A4 sözleşme. DM: PANEL',
    ],
    reels_script: null,
  },

  // ────────────────────────── STORY ──────────────────────────
  {
    id: 'story-gunluk-durum',
    type: 'story',
    goal: "Story üzerinden DM'e yönlendirmek",
    visual_text: 'Bugün kaç aracınız kirada?',
    visual_subtext: null,
    caption: null, // story'de caption kullanılmaz
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Bugün kaç aracınız kirada?',
      'Cevap için defter mi açılıyor?',
      "Tek ekranda görmek için DM'den PANEL yazın.",
    ],
    reels_script: null,
  },
  {
    id: 'story-teslim-kontrol',
    type: 'story',
    goal: "Story üzerinden DM'e yönlendirmek",
    visual_text: 'Araç teslim alınırken neleri kontrol ediyorsunuz?',
    visual_subtext: null,
    caption: null,
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Araç teslim alınırken neleri kontrol ediyorsunuz?',
      'Kontrol bulguları ve teslim notları kiralama kaydına eklenir.',
      'Teslim süreci düzenli ilerlesin. DM: PANEL',
    ],
    reels_script: null,
  },

  // ────────────────────────── REELS ──────────────────────────
  {
    id: 'reels-bir-kiralamanin-yolu',
    type: 'reels',
    goal: 'Paneli kısa videoyla tanıtıp demo talebi almak',
    visual_text: 'Bir kiralama panelde nasıl ilerler?',
    visual_subtext: null,
    caption:
      'Bir kiralamanın panelde izlediği yol: araç seçimi, müşteri bilgisi, kapora, sözleşme, teslim.\n\n' +
      'Hepsi tek panel akışında.\n\n' +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: null,
    reels_scenes: [
      'Bir kiralama panelde nasıl ilerler?',
      'Müsait aracı seç, rezervasyonu kaydet.',
      'Müşteri ve iletişim bilgilerini ekle.',
      'Kapora, ödenen ve kalan tutarı gör.',
      'Teslim notu ve A4 sözleşme tek kayıtta. DM: PANEL',
    ],
    reels_script:
      'Sistem beş dikey marka kartını hareket ve yumuşak geçişlerle 13–15 saniyelik MP4 videoya dönüştürür. Son sahne DM: PANEL çağrısıdır.',
  },
  {
    id: 'reels-defterde-arama',
    type: 'reels',
    goal: 'Paneli kısa videoyla tanıtıp demo talebi almak',
    visual_text: 'Geçen ayki kiralamayı bulmak ne kadar sürüyor?',
    visual_subtext: null,
    caption:
      'Geçen ayki bir kiralamayı bulmanız gerekti. Defterde sayfa sayfa mı arıyorsunuz?\n\n' +
      'Araç Takip Paneli, müşteri ve kiralama kayıtlarını tek yerde tutar.\n\n' +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: null,
    reels_scenes: [
      'Geçen ayki kiralamayı bulmak ne kadar sürüyor?',
      'Defter, Excel ve WhatsApp arasında arama.',
      'Müşteri kayıtlarını tek yerde tut.',
      'Kiralama ve ödeme bilgileri dağılmasın.',
      'Kayıtlar tek yerde. Demo için DM: PANEL',
    ],
    reels_script:
      'Sistem beş dikey marka kartını hareket ve yumuşak geçişlerle 13–15 saniyelik MP4 videoya dönüştürür. Akış sorun → arama → sonuç → DM çağrısıdır.',
  },

  // ────────────────────────── DEMO ──────────────────────────
  {
    id: 'demo-panel-turu',
    type: 'demo',
    goal: 'Panelin içini göstererek demo talebi almak',
    visual_text: "Araç Takip Paneli'nin içi nasıl görünüyor?",
    visual_subtext: 'Araç, müşteri, ödeme ve sözleşme ekranları.',
    caption:
      "Araç Takip Paneli'nde neler var?\n\n" +
      '- Araç listesi: hangi araç kirada, hangisi müsait\n' +
      '- Müşteri kayıtları\n' +
      '- Ödeme takibi: kapora, ödenen ve kalan tutar\n' +
      '- Sözleşme: kiralama bilgileriyle A4 çıktı\n\n' +
      "Kısa bir demo turu için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Panelin içini görmek ister misiniz?',
      'Kısa demo turu için DM: PANEL',
    ],
    reels_script: null,
  },
];
