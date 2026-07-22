// Bu dosya YALNIZCA server tarafında çalışır (Instagram kimlik bilgileri kullanır).
import 'server-only';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { agentLog } from '../log';

/**
 * ════════════════════════════════════════════════════════════════════════
 * PLAYWRIGHT FALLBACK (MOD 2) — Adım 9
 *
 * ⚠️  UYARI — ÖNCE OKUYUN
 * Bu modül, Instagram'a bir tarayıcıyı otomatikleştirerek giriş yapıp
 * paylaşım yapar. Bu yöntem:
 *   • Instagram Kullanım Koşulları'na AYKIRIDIR.
 *   • Hesabınızın kısıtlanması/askıya alınması riskini taşır.
 *   • Instagram arayüzü değiştiğinde SESSİZCE BOZULUR (kırılgandır).
 *   • Bakım gerektirir; seçiciler (selector) zamanla güncellenmelidir.
 *
 * ÖNERİ: Mümkünse Mod 1'i (Meta Graph API, lib/publish/meta.ts) kullanın.
 * Bu modül yalnızca API kurulamayan durumlar için son çaredir ve
 * BİLİNÇLİ olarak devreye alınmadıkça çalışmaz (bkz. isPlaywrightEnabled).
 * ════════════════════════════════════════════════════════════════════════
 *
 * GÜVENLİK KURALLARI (bu dosyada uygulanır):
 *   • INSTAGRAM_PASSWORD asla loglanmaz, hataya konmaz, döndürülmez.
 *     Tüm hata metinleri sanitize()'den geçer.
 *   • Oturum (cookie/storage) güvenli biçimde diske yazılır: yol
 *     .gitignore'dadır (playwright/.auth, storageState.json) → repoya girmez.
 *   • Bir sonraki paylaşımda önce kayıtlı oturum denenir; şifre yalnızca
 *     oturum yoksa/geçersizse kullanılır → şifrenin kullanımı en aza iner.
 *   • Yayın (paylaş butonuna basma) YAPILMADAN ÖNCE, çağıran taraftan
 *     gelen reconfirm() callback'i ÇAĞRILIR; taslak hâlâ 'approved'
 *     değilse paylaşım son anda iptal edilir (kritik kuralın Mod 2 aynası).
 *
 * KURULUM (opt-in): Bu modül varsayılan olarak KAPALIDIR. Açmak için:
 *   1) `npm i -D playwright && npx playwright install chromium`
 *   2) .env.local → INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD doldurun
 *   3) .env.local → ENABLE_PLAYWRIGHT_FALLBACK=true ekleyin (bilinçli onay)
 * Üçü de tamam değilse fonksiyon nazikçe "kapalı" döner; API modu etkilenmez.
 */

const AUTH_DIR = path.join(process.cwd(), 'playwright', '.auth');
const STORAGE_STATE = path.join(AUTH_DIR, 'ig-session.json');

// Instagram arayüzü değiştiğinde GÜNCELLENMESİ GEREKEN seçiciler.
// Tek yerde toplandı ki bakım kolay olsun. Birden çok aday denenir.
const SELECTORS = {
  usernameInput: 'input[name="username"]',
  passwordInput: 'input[name="password"]',
  loginSubmit: 'button[type="submit"]',
  // Giriş sonrası "Bilgileri kaydet?" / "Bildirimleri aç?" diyalogları
  dismissButtons: [
    'text=/^Şimdi Değil$/i',
    'text=/^Not Now$/i',
    'text=/^Daha Sonra$/i',
  ],
  // Yeni gönderi akışı (bu adımlar Instagram güncellemeleriyle değişebilir)
  createEntry: [
    'svg[aria-label="Yeni gönderi"]',
    'svg[aria-label="New post"]',
    'a[href="#"] :text("Oluştur")',
  ],
};

export interface PlaywrightStatus {
  enabled: boolean;
  reasons: string[]; // kapalıysa nedenleri (kullanıcıya gösterilebilir, gizli bilgi içermez)
}

/**
 * Mod 2'nin çalışıp çalışamayacağını söyler. Şifre değeri OKUNMAZ,
 * yalnızca doluluk kontrol edilir.
 */
export function getPlaywrightStatus(): PlaywrightStatus {
  const reasons: string[] = [];
  if (process.env.ENABLE_PLAYWRIGHT_FALLBACK !== 'true') {
    reasons.push('ENABLE_PLAYWRIGHT_FALLBACK=true değil (bilinçli devreye alma gerekli)');
  }
  if (!process.env.INSTAGRAM_USERNAME) reasons.push('INSTAGRAM_USERNAME boş');
  if (!process.env.INSTAGRAM_PASSWORD) reasons.push('INSTAGRAM_PASSWORD boş');
  return { enabled: reasons.length === 0, reasons };
}

export function isPlaywrightEnabled(): boolean {
  return getPlaywrightStatus().enabled;
}

/** Şifre ve kullanıcı adını her türlü metinden ayıklar. */
function sanitize(message: string): string {
  let out = message;
  const pw = process.env.INSTAGRAM_PASSWORD;
  const user = process.env.INSTAGRAM_USERNAME;
  if (pw) out = out.split(pw).join('[GİZLİ]');
  if (user) out = out.split(user).join('[KULLANICI]');
  return out;
}

/**
 * playwright'i DİNAMİK import eder. Paket kurulu değilse (varsayılan),
 * build veya API modu bundan hiç etkilenmez — import yalnızca bu fonksiyon
 * çağrılınca denenir.
 */
async function loadPlaywright() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('playwright');
    return mod.chromium;
  } catch {
    throw new Error(
      'Playwright kurulu değil. Mod 2 için: npm i -D playwright && npx playwright install chromium'
    );
  }
}

export interface PlaywrightPublishParams {
  imageUrl: string;
  caption: string | null;
  /**
   * Yayın (paylaş) YAPILMADAN hemen önce çağrılır. false dönerse
   * paylaşım son anda iptal edilir. Kritik kuralın Mod 2 güvencesidir:
   * çağıran taraf burada taslağın hâlâ 'approved' olduğunu doğrular.
   */
  reconfirm: () => Promise<boolean>;
  db: SupabaseClient;
  draftId: string;
}

/**
 * Instagram'a Playwright ile giriş yapıp görseli paylaşır.
 *
 * NOT: Bu bir İSKELETTİR. Instagram'ın gerçek gönderi-oluşturma akışı
 * (dosya yükleme diyaloğu, kırpma, "İleri" adımları, caption alanı)
 * sürekli değiştiği için, akışın gönderi-oluşturma kısmı bilinçli olarak
 * TODO bırakılmıştır; giriş, oturum saklama, güvenlik ve yeniden-onay
 * mekanizması ise tamdır. Üretimde gönderi adımlarının güncel arayüze
 * göre doldurulması ve test edilmesi gerekir.
 */
export async function publishViaPlaywright(
  params: PlaywrightPublishParams
): Promise<{ ok: true } > {
  const status = getPlaywrightStatus();
  if (!status.enabled) {
    throw new Error('Playwright fallback kapalı: ' + status.reasons.join(', '));
  }

  const chromium = await loadPlaywright();
  const username = process.env.INSTAGRAM_USERNAME as string;
  const password = process.env.INSTAGRAM_PASSWORD as string;

  const { promises: fs } = await import('fs');
  await fs.mkdir(AUTH_DIR, { recursive: true });

  // Kayıtlı oturum var mı? (şifre kullanımını en aza indirir)
  let storageState: string | undefined;
  try {
    await fs.access(STORAGE_STATE);
    storageState = STORAGE_STATE;
  } catch {
    storageState = undefined;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext(
      storageState ? { storageState } : undefined
    );
    const page = await context.newPage();

    // ── 1) Oturum aç (gerekiyorsa) ──
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });

    const loggedIn = await page
      .locator(SELECTORS.usernameInput)
      .count()
      .then((n: number) => n === 0)
      .catch(() => false);

    if (!loggedIn) {
      await page.fill(SELECTORS.usernameInput, username);
      await page.fill(SELECTORS.passwordInput, password);
      await page.click(SELECTORS.loginSubmit);
      await page.waitForLoadState('networkidle').catch(() => undefined);

      // Giriş başarısız mı? (şifre alanı hâlâ duruyorsa)
      const stillLogin = await page.locator(SELECTORS.passwordInput).count();
      if (stillLogin > 0) {
        throw new Error(
          'Instagram girişi başarısız. Kullanıcı adı/şifre hatalı olabilir ya da ' +
            'ek doğrulama (2FA / şüpheli giriş) gerekiyor olabilir. Mod 2 bu durumları ' +
            'otomatik çözemez; Mod 1 (Meta API) önerilir.'
        );
      }

      // Bilgi/izin diyaloglarını kapat
      for (const sel of SELECTORS.dismissButtons) {
        const btn = page.locator(sel).first();
        if (await btn.count()) await btn.click().catch(() => undefined);
      }

      // Oturumu güvenli konuma kaydet (bir sonraki sefere şifre gerekmesin)
      await context.storageState({ path: STORAGE_STATE });
      await agentLog(params.db, 'playwright_login', 'Playwright ile oturum açıldı ve kaydedildi', {
        draftId: params.draftId,
      });
    }

    // ── 2) YAYIN ÖNCESİ YENİDEN ONAY (kritik kural — Mod 2 aynası) ──
    // Paylaş adımına GEÇMEDEN hemen önce taslağın hâlâ onaylı olduğu
    // doğrulanır. Bu ara pencerede içerik reddedildiyse/düzenlendiyse
    // paylaşım YAPILMAZ.
    const stillApproved = await params.reconfirm();
    if (!stillApproved) {
      await agentLog(
        params.db,
        'publish_blocked',
        'Playwright: yayın öncesi kontrolde içerik artık onaylı değil, iptal edildi',
        { draftId: params.draftId }
      );
      throw new Error('Yayın öncesi kontrol: içerik artık onaylı değil, paylaşım iptal edildi.');
    }

    // ── 3) GÖNDERİ OLUŞTUR (TODO — güncel arayüze göre doldurulmalı) ──
    // Buraya kadar olan kısım (giriş, oturum, güvenlik, yeniden onay) tamdır.
    // Aşağıdaki gönderi akışı Instagram arayüzüne bağımlı olduğu ve sık
    // değiştiği için üretim öncesi güncel selektörlerle tamamlanmalıdır:
    //
    //   a) params.imageUrl'i geçici dosyaya indir (fetch → buffer → /tmp).
    //   b) "Yeni gönderi" (SELECTORS.createEntry) → dosya input'una setInputFiles.
    //   c) Kırpma/"İleri" adımlarını geç.
    //   d) Caption alanına params.caption yaz.
    //   e) "Paylaş" butonuna bas, tamamlanmasını bekle.
    //   f) Gönderi URL'ini/paylaşım doğrulamasını yakala.
    //
    // Bu adımlar tamamlanana kadar Mod 2 gönderi YAPMAZ; bilinçli olarak
    // burada durur ve net bir uyarı döndürür — sessizce "başarılı" demez.
    throw new Error(
      'Playwright gönderi akışı bu sürümde tamamlanmadı (Instagram arayüzü sık değiştiği için ' +
        'iskelet bırakıldı). Lütfen Mod 1 (Meta Graph API) kullanın; Mod 2 gönderi adımları ' +
        'güncel arayüze göre doldurulup test edilmelidir.'
    );

    // Tamamlandığında akış şöyle biter:
    // await agentLog(params.db, 'publish_success', 'Playwright ile paylaşıldı', { draftId: params.draftId, mode: 'playwright' });
    // return { ok: true };
  } catch (e) {
    const raw = e instanceof Error ? e.message : 'Bilinmeyen hata';
    throw new Error(sanitize(raw));
  } finally {
    await browser.close().catch(() => undefined);
  }
}
