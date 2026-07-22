/*
 * ════════════════════════════════════════════════════════════════════════
 * SMOKE TEST — Adım 11
 *
 * Çalışan sunucuya karşı KRİTİK KURALLARI uçtan uca doğrular. Gerçek
 * paylaşım YAPMAZ; yalnızca engellerin doğru çalıştığını kanıtlar
 * (onaysız paylaşım 403, görselsiz onay reddi, çift paylaşım 409, vb.).
 *
 * ÇALIŞTIRMA:
 *   1) Ayrı bir terminalde:  npm run dev
 *   2) Bu terminalde:        npm run smoke
 *      (veya farklı adres:   BASE_URL=http://localhost:3000 npm run smoke)
 *
 * Bağımlılık yok — sadece Node'un yerleşik fetch'i (Node 18+) kullanılır.
 * Test, veritabanına yazmaz: yalnızca mevcut taslaklar üzerinden okur ve
 * reddedilmesi GEREKEN istekleri gönderip reddedildiklerini doğrular.
 * ════════════════════════════════════════════════════════════════════════
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`  \x1b[32m✓\x1b[0m ${name}`);
}
function fail(name, detail) {
  failed++;
  console.log(`  \x1b[31m✗\x1b[0m ${name}`);
  if (detail) console.log(`      → ${detail}`);
}

async function api(path, init) {
  const res = await fetch(BASE_URL + path, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* boş gövde olabilir */
  }
  return { status: res.status, body };
}

const jsonPost = (obj) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
});

async function main() {
  console.log(`\nSmoke test — hedef: ${BASE_URL}\n`);

  // ── 0) Sunucu ayakta mı? ──
  let drafts;
  try {
    const r = await api('/api/drafts');
    if (r.status !== 200 || !r.body || !Array.isArray(r.body.drafts)) {
      fail('Sunucuya erişim', `Beklenen 200 + {drafts:[...]}, gelen ${r.status}`);
      console.log('\nSunucu yanıt vermiyor. Önce "npm run dev" çalıştırın.\n');
      process.exit(1);
    }
    drafts = r.body.drafts;
    ok(`/api/drafts erişilebilir (${drafts.length} taslak)`);
  } catch (e) {
    console.log(`\nSunucuya bağlanılamadı (${e.message}). Önce "npm run dev" çalıştırın.\n`);
    process.exit(1);
  }

  console.log('\nKRİTİK KURAL: onay olmadan paylaşım yapılamaz\n');

  // ── 1) Var olmayan taslak → 404 ──
  {
    const r = await api('/api/publish', jsonPost({ draftId: '00000000-0000-0000-0000-000000000000' }));
    r.status === 404
      ? ok('Var olmayan taslağın paylaşımı reddedilir (404)')
      : fail('Var olmayan taslak 404 dönmeli', `gelen ${r.status}`);
  }

  // ── 2) draftId eksik → 400 ──
  {
    const r = await api('/api/publish', jsonPost({}));
    r.status === 400
      ? ok('draftId olmadan istek reddedilir (400)')
      : fail('draftId eksikse 400 dönmeli', `gelen ${r.status}`);
  }

  // ── 3) 'draft' (onaysız) bir içerik → 403 + engel ──
  const draftStatus = drafts.find((d) => d.status === 'draft');
  if (draftStatus) {
    const r = await api('/api/publish', jsonPost({ draftId: draftStatus.id }));
    r.status === 403
      ? ok("Onaysız ('draft') içerik paylaşımı engellenir (403)")
      : fail("Onaysız içerik 403 dönmeli", `gelen ${r.status} — ${r.body?.error ?? ''}`);
  } else {
    console.log('  \x1b[33m•\x1b[0m Onay bekleyen taslak yok — bu testi çalıştırmak için panelden içerik üretin.');
  }

  // ── 4) 'rejected' içerik → paylaşılamaz (403) ──
  const rejected = drafts.find((d) => d.status === 'rejected');
  if (rejected) {
    const r = await api('/api/publish', jsonPost({ draftId: rejected.id }));
    r.status === 403
      ? ok("Reddedilmiş içerik paylaşılamaz (403)")
      : fail("Reddedilmiş içerik 403 dönmeli", `gelen ${r.status}`);
  }

  // ── 5) Zaten paylaşılmış içerik → tekrar paylaşılamaz (403/409) ──
  const published = drafts.find((d) => d.status === 'published');
  if (published) {
    const r = await api('/api/publish', jsonPost({ draftId: published.id }));
    r.status === 403 || r.status === 409
      ? ok(`Paylaşılmış içerik tekrar paylaşılamaz (${r.status})`)
      : fail('Paylaşılmış içerik 403/409 dönmeli', `gelen ${r.status}`);
  }

  console.log('\nİÇERİK BÜTÜNLÜĞÜ\n');

  // ── 6) Yasaklı ifade denetimi (konu havuzu üzerinde, sunucusuz) ──
  // Not: Bu kontrol dil kuralının kod tarafını doğrular; ağ gerektirmez.
  {
    const forbidden = ['rakipsiz', '10 kat', 'devrim niteliğinde', "türkiye'nin en iyi"];
    // /api/drafts'tan gelen görünür metinleri tara
    const texts = drafts
      .flatMap((d) => [d.visual_text, d.visual_subtext, d.caption, d.cta, ...(d.story_texts || [])])
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('tr');
    const hit = forbidden.find((p) => texts.includes(p.toLocaleLowerCase('tr')));
    hit
      ? fail('Mevcut taslaklarda yasaklı ifade var', `"${hit}" bulundu`)
      : ok('Mevcut taslaklarda yasaklı ifade yok');
  }

  // ── 7) Onaylı ama görselsiz içerik → paylaşım reddi (400) ──
  // (Yalnızca uygun bir taslak varsa; test veri oluşturmaz.)
  const approvedNoImage = drafts.find(
    (d) => d.status === 'approved' && !d.image_url && d.content_type !== 'reels'
  );
  if (approvedNoImage) {
    const r = await api('/api/publish', jsonPost({ draftId: approvedNoImage.id }));
    r.status === 400
      ? ok('Görseli olmayan onaylı içerik paylaşılamaz (400)')
      : fail('Görselsiz onaylı içerik 400 dönmeli', `gelen ${r.status}`);
  }

  // ── Sonuç ──
  console.log(`\n${'─'.repeat(48)}`);
  console.log(`Sonuç: \x1b[32m${passed} geçti\x1b[0m, ${failed ? `\x1b[31m${failed} kaldı\x1b[0m` : '0 kaldı'}`);
  console.log(`${'─'.repeat(48)}\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('Test çalışırken hata:', e.message);
  process.exit(1);
});
