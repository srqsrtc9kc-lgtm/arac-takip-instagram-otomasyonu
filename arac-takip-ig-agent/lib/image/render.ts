// Bu dosya YALNIZCA server tarafında çalışır (font okuma + PNG üretimi).
import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { ContentDraft } from '../types';
import { buildImageSpec } from './template';

/**
 * PNG ÜRETİCİ — Adım 7
 *
 * Akış: taslak → satori (metin dizgisi + SVG) → resvg (SVG → PNG).
 * Font: projeye gömülü DejaVu Sans (Türkçe karakterlerin tamamını
 * kapsar; lisansı assets/fonts/LICENSE-DejaVu.txt içinde).
 * Sunucu ortam fontlarına bağımlılık YOK → lokalde ve Vercel'de
 * aynı sonuç üretilir.
 */

let fontsPromise: Promise<{ regular: Buffer; bold: Buffer }> | null = null;

function loadFonts() {
  if (!fontsPromise) {
    const dir = path.join(process.cwd(), 'assets', 'fonts');
    fontsPromise = Promise.all([
      fs.readFile(path.join(dir, 'DejaVuSans.ttf')),
      fs.readFile(path.join(dir, 'DejaVuSans-Bold.ttf')),
    ]).then(([regular, bold]) => ({ regular, bold }));
  }
  return fontsPromise;
}

export async function renderDraftImage(draft: ContentDraft): Promise<Buffer> {
  const { width, height, element } = buildImageSpec(draft);
  const { regular, bold } = await loadFonts();

  const svg = await satori(element as unknown as Parameters<typeof satori>[0], {
    width,
    height,
    fonts: [
      { name: 'DejaVu Sans', data: regular, weight: 400, style: 'normal' },
      { name: 'DejaVu Sans', data: bold, weight: 700, style: 'normal' },
    ],
  });

  const png = new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng();
  return Buffer.from(png);
}
