import type { ContentDraft } from '../types';

/**
 * GÖRSEL ŞABLONU — v2 (zengin marka tasarımı)
 *
 * Taslak metinlerinden marka görseli üretir (satori element ağacı).
 * Tasarım dili: koyu lacivert degrade zemin, mavi ışık vurguları,
 * panel-çizgisi motifi, güçlü tipografi hiyerarşisi.
 *
 * Boyutlar:
 * - post / demo → 1080×1080 (kare)
 * - story / reels → 1080×1920 (dikey; reels için kapak görseli)
 *
 * JSX kullanılmaz; satori'nin kabul ettiği düz obje yapısı kurulur.
 * satori kuralı: birden çok çocuğu olan her kutuda display:flex olmalı.
 */

export interface ImgNode {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: ImgNode | ImgNode[] | string;
  };
}

export interface ImageSpec {
  width: number;
  height: number;
  element: ImgNode;
}

/**
 * GÖRSEL VARYANTLARI
 * Her taslak, kimliğinden (draft.id) türetilen DETERMİNİSTİK bir varyant
 * alır: 4 renk paleti × 2 dekor yerleşimi = 8 farklı görünüm.
 * - Aynı taslak → her zaman aynı görsel (onayladığınız görsel değişmez).
 * - Farklı taslaklar → farklı görünüm (akış tekdüze olmaz).
 * Tüm paletler koyu zemin + soğuk vurgu ailesinde kalır (marka: abartısız).
 */

interface Palette {
  bgFrom: string;
  bgMid: string;
  bgTo: string;
  brand: string;
  accent: string;
  accentSoft: string;
  glow: string;
  glow2: string;
  headline: string;
  sub: string;
  kicker: string;
  ctaText: string;
  ctaBg: string;
  ctaBorder: string;
  line: string;
}

const PALETTES: Palette[] = [
  {
    // 1 — Klasik mavi (marka ana rengi)
    bgFrom: '#0b1220',
    bgMid: '#0a0f1c',
    bgTo: '#05070d',
    brand: '#7db4ff',
    accent: '#2f6bff',
    accentSoft: 'rgba(47, 107, 255, 0.16)',
    glow: 'rgba(47, 107, 255, 0.22)',
    glow2: 'rgba(23, 66, 173, 0.18)',
    headline: '#f4f7ff',
    sub: '#9fb0cc',
    kicker: '#6f83a8',
    ctaText: '#dbe8ff',
    ctaBg: 'rgba(47, 107, 255, 0.20)',
    ctaBorder: 'rgba(96, 145, 255, 0.65)',
    line: 'rgba(120, 150, 210, 0.16)',
  },
  {
    // 2 — Camgöbeği / petrol
    bgFrom: '#071a1e',
    bgMid: '#06141a',
    bgTo: '#04090d',
    brand: '#6fd7e0',
    accent: '#0ea5b7',
    accentSoft: 'rgba(14, 165, 183, 0.16)',
    glow: 'rgba(14, 165, 183, 0.22)',
    glow2: 'rgba(9, 106, 128, 0.18)',
    headline: '#f2fbfc',
    sub: '#9cc3ca',
    kicker: '#69929b',
    ctaText: '#d8f5f8',
    ctaBg: 'rgba(14, 165, 183, 0.18)',
    ctaBorder: 'rgba(96, 205, 220, 0.6)',
    line: 'rgba(110, 190, 200, 0.15)',
  },
  {
    // 3 — Çivit / gece moru
    bgFrom: '#12102a',
    bgMid: '#0e0c22',
    bgTo: '#070612',
    brand: '#a5a8ff',
    accent: '#5b5ef0',
    accentSoft: 'rgba(91, 94, 240, 0.17)',
    glow: 'rgba(91, 94, 240, 0.22)',
    glow2: 'rgba(56, 58, 168, 0.18)',
    headline: '#f5f5ff',
    sub: '#a9abd6',
    kicker: '#7a7cb0',
    ctaText: '#e2e3ff',
    ctaBg: 'rgba(91, 94, 240, 0.20)',
    ctaBorder: 'rgba(150, 152, 255, 0.6)',
    line: 'rgba(140, 142, 220, 0.16)',
  },
  {
    // 4 — Çelik / buz mavisi
    bgFrom: '#0e141c',
    bgMid: '#0b1017',
    bgTo: '#06090d',
    brand: '#9fc4e8',
    accent: '#3d7fb8',
    accentSoft: 'rgba(61, 127, 184, 0.17)',
    glow: 'rgba(61, 127, 184, 0.20)',
    glow2: 'rgba(38, 84, 126, 0.18)',
    headline: '#f3f7fb',
    sub: '#a4b6c8',
    kicker: '#71879b',
    ctaText: '#dcebf8',
    ctaBg: 'rgba(61, 127, 184, 0.20)',
    ctaBorder: 'rgba(130, 175, 220, 0.6)',
    line: 'rgba(130, 160, 195, 0.16)',
  },
];

/** Basit, kararlı hash — aynı id her zaman aynı sayıyı verir. */
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Metin uzunluğuna göre başlık puntosu — taşmayı önler.
function headlineSize(text: string, vertical: boolean): number {
  const n = text.length;
  if (vertical) {
    if (n <= 26) return 104;
    if (n <= 42) return 92;
    if (n <= 60) return 80;
    return 68;
  }
  if (n <= 26) return 92;
  if (n <= 42) return 80;
  if (n <= 60) return 68;
  return 58;
}

function el(
  style: Record<string, string | number>,
  children?: ImgNode | ImgNode[] | string
): ImgNode {
  return { type: 'div', props: { style, children } };
}

/** İçerik türünün köşe etiketi (görselde küçük, zarif bir işaret). */
function typeKicker(t: ContentDraft['content_type']): string {
  switch (t) {
    case 'story':
      return 'GÜNÜN SORUSU';
    case 'reels':
      return 'KISA VİDEO';
    case 'demo':
      return 'PANELİN İÇİ';
    default:
      return 'RENT A CAR İŞLETMECİLERİNE';
  }
}

/**
 * Dekoratif arka plan katmanı: iki yumuşak ışık küresi + "panel
 * çizgileri" motifi (yazılımı ima eden üç yatay bar).
 * flip=true olduğunda ışık ve bar motifi ayna görünümde yerleşir —
 * yerleşim varyantı budur. Hepsi position:absolute.
 */
function backdrop(
  width: number,
  height: number,
  vertical: boolean,
  C: Palette,
  flip: boolean
): ImgNode[] {
  const barW = vertical ? 300 : 260;
  const barY = height - (vertical ? 340 : 300);
  const bars = [0, 1, 2].map((i) =>
    el({
      position: 'absolute',
      ...(flip ? { left: 72 } : { right: 72 }),
      top: barY + i * 54,
      width: barW - i * 70,
      height: 18,
      borderRadius: 9,
      backgroundColor: i === 0 ? C.accentSoft : C.line,
    })
  );
  return [
    // Büyük ışık (varyanta göre sağ üst veya sol üst)
    el({
      position: 'absolute',
      top: -220,
      ...(flip ? { left: -220 } : { right: -220 }),
      width: 640,
      height: 640,
      borderRadius: 640,
      backgroundImage: `radial-gradient(circle at center, ${C.glow} 0%, rgba(0,0,0,0) 62%)`,
    }),
    // İkinci, soluk ışık (çaprazda)
    el({
      position: 'absolute',
      bottom: -260,
      ...(flip ? { right: -260 } : { left: -260 }),
      width: 720,
      height: 720,
      borderRadius: 720,
      backgroundImage: `radial-gradient(circle at center, ${C.glow2} 0%, rgba(0,0,0,0) 60%)`,
    }),
    // İnce çerçeve — kartı toparlar
    el({
      position: 'absolute',
      top: 36,
      left: 36,
      width: width - 72,
      height: height - 72,
      border: `2px solid ${C.line}`,
      borderRadius: 40,
    }),
    ...bars,
  ];
}

export function buildImageSpec(draft: ContentDraft): ImageSpec {
  const vertical = draft.content_type === 'story' || draft.content_type === 'reels';
  const width = 1080;
  const height = vertical ? 1920 : 1080;
  const pad = vertical ? 128 : 104;

  // ── Varyant seçimi (deterministik: aynı taslak → aynı görsel) ──
  const seed = hashSeed(draft.id || draft.visual_text || 'arac-takip');
  const C = PALETTES[seed % PALETTES.length];
  const flip = ((seed >> 3) & 1) === 1;

  const headline = draft.visual_text || 'Araç Takip Paneli';
  const sub = draft.visual_subtext;
  const cta = draft.cta;

  // ── İçerik katmanı ──
  const content = el(
    {
      position: 'absolute',
      top: 0,
      left: 0,
      width,
      height,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: pad,
    },
    [
      // ÜST: marka satırı (nokta + isim)
      el({ display: 'flex', alignItems: 'center' }, [
        el({
          width: 18,
          height: 18,
          borderRadius: 18,
          backgroundColor: C.accent,
          marginRight: 18,
        }),
        el(
          {
            color: C.brand,
            fontSize: vertical ? 42 : 38,
            fontWeight: 700,
            letterSpacing: 1,
          },
          'Araç Takip Paneli'
        ),
      ]),

      // ORTA: kicker + başlık + alt metin
      el({ display: 'flex', flexDirection: 'column' }, [
        el(
          {
            color: C.kicker,
            fontSize: vertical ? 32 : 28,
            fontWeight: 700,
            letterSpacing: 6,
            marginBottom: vertical ? 36 : 30,
          },
          typeKicker(draft.content_type)
        ),
        el({
          width: 96,
          height: 10,
          backgroundColor: C.accent,
          borderRadius: 5,
          marginBottom: vertical ? 44 : 36,
        }),
        el(
          {
            color: C.headline,
            fontSize: headlineSize(headline, vertical),
            fontWeight: 700,
            lineHeight: 1.12,
            maxWidth: width - pad * 2,
          },
          headline
        ),
        ...(sub
          ? [
              el(
                {
                  color: C.sub,
                  fontSize: vertical ? 46 : 42,
                  lineHeight: 1.4,
                  marginTop: 32,
                  maxWidth: width - pad * 2 - 60,
                },
                sub
              ),
            ]
          : []),
      ]),

      // ALT: CTA hapı + el yazısı değil, net davet
      cta
        ? el(
            {
              display: 'flex',
              alignSelf: 'flex-start',
              alignItems: 'center',
              backgroundColor: C.ctaBg,
              border: `2px solid ${C.ctaBorder}`,
              borderRadius: 999,
              padding: vertical ? '22px 42px' : '20px 38px',
            },
            [
              el({
                width: 12,
                height: 12,
                borderRadius: 12,
                backgroundColor: C.brand,
                marginRight: 16,
              }),
              el(
                {
                  color: C.ctaText,
                  fontSize: vertical ? 38 : 34,
                  fontWeight: 700,
                },
                cta
              ),
            ]
          )
        : el({ height: 1 }),
    ]
  );

  // ── Kök: degrade zemin + dekor + içerik ──
  const element = el(
    {
      width,
      height,
      display: 'flex',
      position: 'relative',
      backgroundImage: `linear-gradient(160deg, ${C.bgFrom} 0%, ${C.bgMid} 55%, ${C.bgTo} 100%)`,
      fontFamily: 'DejaVu Sans',
    },
    [...backdrop(width, height, vertical, C, flip), content]
  );

  return { width, height, element };
}
