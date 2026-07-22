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
  reels_script: string | null;
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
    visual_subtext: 'Bekleyen ödemeler tek listede.',
    caption:
      'Kiralama bitti, araç teslim alındı. Peki ödeme tamamlandı mı?\n\n' +
      'İş yoğunlaşınca bekleyen ödemeleri akılda tutmak zorlaşır. Deftere not düşülür, araya başka işler girer, tahsilat gecikir.\n\n' +
      "Araç Takip Paneli'nde her kiralamanın ödeme durumu kayıtlıdır. Bekleyen ödemeler tek listede görünür; kimin ne kadar ödemesi kaldığı bellidir.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Bekleyen ödemeleri ezbere mi takip ediyorsunuz?',
      'Ödemesi kalan müşteriler tek listede görünsün. DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'cift-rezervasyon',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: 'Aynı araca iki müşteri yazıldı mı hiç?',
    visual_subtext: 'Müsaitlik takvimi çakışmayı baştan önler.',
    caption:
      'Telefonda bir müşteri, WhatsApp\'ta bir başkası. Araç takvimi tek yerde olmayınca aynı araca iki rezervasyon alınabilir.\n\n' +
      'Sonuç: müşteriye son dakikada araç değişikliği ya da iptal söylemek zorunda kalırsınız.\n\n' +
      "Araç Takip Paneli'nde her aracın kirada/müsait durumu ve tarihleri tek takvimde durur. Rezervasyon almadan önce müsaitlik netleşir.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Aracın müsait olup olmadığını nereden kontrol ediyorsunuz?',
      'Araç takvimi tek ekranda. Demo için DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'sozlesme-duzeni',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: 'Sözleşme nerede? Klasörde mi, araçta mı?',
    visual_subtext: 'Her kiralamanın sözleşmesi kaydının üstünde.',
    caption:
      'Bir anlaşmazlık çıktığında ilk aranan şey sözleşmedir. O an sözleşme bulunamazsa iş zorlaşır.\n\n' +
      'Klasörler, çekmeceler, telefondaki fotoğraflar... Evrak dağıldıkça arama süresi uzar.\n\n' +
      "Araç Takip Paneli'nde sözleşme, ait olduğu kiralama kaydının üstünde durur. Müşteri adıyla arayıp saniyeler içinde açarsınız.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Geçen ayki bir sözleşmeyi kaç dakikada bulursunuz?',
      'Sözleşme, kiralama kaydının üstünde dursun. DM: PANEL',
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
      "Araç Takip Paneli'nde kapora tutarı ve tarihi, kiralama kaydının üstüne işlenir. Teslim günü kalan tutar nettir.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Kapora bilgilerini nerede tutuyorsunuz?',
      'Kapora, kiralama kaydının üstünde dursun. DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'bakim-kilometre',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: 'Hangi aracın bakımı yaklaştı?',
    visual_subtext: 'Kilometre ve bakım takibi tek ekranda.',
    caption:
      'Araç kiradayken kilometresi işler, bakım tarihi yaklaşır. Takip edilmezse bakım gecikir; gecikmiş bakım hem masrafı hem riski büyütür.\n\n' +
      "Araç Takip Paneli'nde her aracın güncel kilometresi ve bakım bilgisi kayıtlıdır. Bakımı yaklaşan araçlar tek listede görünür.\n\n" +
      'Araçlarınız işinizin sermayesi; takibi de düzenli olmalı.\n\n' +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Araç bakımlarını nasıl takip ediyorsunuz?',
      'Bakımı yaklaşan araçlar tek listede. DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'musteri-gecmisi',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: "Müşteri bilgileri WhatsApp'ta dağılmasın.",
    visual_subtext: 'Ad, telefon ve kiralama geçmişi tek kayıtta.',
    caption:
      'Bir müşteri ikinci kez aradığında geçmişini hatırlamak güven verir: daha önce hangi aracı almış, ödemesini nasıl yapmış?\n\n' +
      'Bu bilgiler WhatsApp yazışmalarında ve defter sayfalarında dağınık durursa her seferinde baştan sorulur.\n\n' +
      "Araç Takip Paneli'nde her müşterinin adı, telefonu ve kiralama geçmişi tek kayıtta tutulur. Aradığınızda karşınızdadır.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Eski bir müşterinin kiralama geçmişine ne kadar sürede ulaşıyorsunuz?',
      'Müşteri geçmişi tek kayıtta dursun. DM: PANEL',
    ],
    reels_script: null,
  },
  {
    id: 'ay-sonu-hesap',
    type: 'post',
    goal: "DM'den demo talebi almak",
    visual_text: 'Ay sonu hesabı saatlerinizi mi alıyor?',
    visual_subtext: 'Aylık gelir özeti panelde hazır.',
    caption:
      'Ay bitti. Bu ay kaç kiralama yapıldı, toplam gelir ne oldu, ne kadar tahsilat bekliyor?\n\n' +
      'Cevap defter ve Excel arasında toplama yapmayı gerektiriyorsa, ay sonu her seferinde saatler alır.\n\n' +
      "Araç Takip Paneli'nde kiralamalar kaydedildikçe aylık gelir özeti kendiliğinden oluşur. Ay sonunda tablo hazırdır.\n\n" +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: [
      'Bu ayın gelirini şu an söyleyebilir misiniz?',
      'Aylık özet panelde hazır dursun. DM: PANEL',
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
      'Kilometre, yakıt, hasar notu... hepsi kiralama kaydına işlenir.',
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
      'Hepsi tek ekranda, sırayla.\n\n' +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: null,
    reels_script:
      "SAHNE 1 (0–3 sn): Kapak metni ekranda: 'Bir kiralama panelde nasıl ilerler?'\n" +
      'SAHNE 2 (3–8 sn): Ekran kaydı — araç listesinden müsait bir araç seçilir.\n' +
      'SAHNE 3 (8–13 sn): Müşteri bilgileri girilir (ad, telefon).\n' +
      'SAHNE 4 (13–18 sn): Kapora ve ödeme bilgisi kaydedilir.\n' +
      'SAHNE 5 (18–23 sn): Sözleşme kiralama kaydına eklenir.\n' +
      'SAHNE 6 (23–28 sn): Teslim tarihi ve kilometre işlenir.\n' +
      "KAPANIŞ (28–32 sn): Ekranda: 'Hepsi tek panelde. Demo için DM'den PANEL yazın.'\n" +
      'NOT: Sahneler panel ekran kaydıyla çekilir. Ekrandaki metinler kısa tutulur, sakin bir fon müziği kullanılır.',
  },
  {
    id: 'reels-defterde-arama',
    type: 'reels',
    goal: 'Paneli kısa videoyla tanıtıp demo talebi almak',
    visual_text: 'Geçen ayki kiralamayı bulmak ne kadar sürüyor?',
    visual_subtext: null,
    caption:
      'Geçen ayki bir kiralamayı bulmanız gerekti. Defterde sayfa sayfa mı arıyorsunuz?\n\n' +
      'Panelde müşteri adını yazmak yeterli; kayıt saniyeler içinde açılır.\n\n' +
      "Demo görmek için DM'den 'PANEL' yazabilirsiniz.",
    cta: CTA,
    hashtags: BASE_HASHTAGS,
    story_texts: null,
    reels_script:
      "SAHNE 1 (0–3 sn): Kapak metni: 'Geçen ayki kiralamayı bulmak ne kadar sürüyor?'\n" +
      'SAHNE 2 (3–12 sn): Defter sayfaları çevrilirken çekim; aranan kayıt bir türlü bulunamaz.\n' +
      'SAHNE 3 (12–20 sn): Ekran kaydı — panelde arama kutusuna müşteri adı yazılır, kayıt hemen açılır.\n' +
      "KAPANIŞ (20–25 sn): Ekranda: 'Kayıtlar aradığınızda karşınızda. Demo için DM'den PANEL yazın.'\n" +
      'NOT: İki sahne arasında abartılı kıyas yapılmaz; yalnızca akış gösterilir.',
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
      '- Müşteri kayıtları: ad, telefon, kiralama geçmişi\n' +
      '- Ödeme takibi: alınan kapora ve bekleyen tahsilatlar\n' +
      '- Sözleşmeler: her kiralamanın belgesi kaydının üstünde\n\n' +
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
