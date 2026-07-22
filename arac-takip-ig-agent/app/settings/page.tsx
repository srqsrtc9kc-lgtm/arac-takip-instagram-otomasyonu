export const dynamic = 'force-dynamic';

// GÜVENLİK: Bu sayfa server component'tir ve ortam değişkenlerinin
// YALNIZCA dolu/boş durumunu gösterir. Değerlerin kendisi hiçbir
// koşulda frontend'e gönderilmez veya ekranda gösterilmez.

function Row({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {detail && <p className="mt-0.5 text-xs text-neutral-500">{detail}</p>}
      </div>
      <span
        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          ok
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : 'border-neutral-700 bg-neutral-800 text-neutral-400'
        }`}
      >
        {ok ? 'Hazır' : 'Eksik'}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const supabaseOk = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const metaOk = Boolean(
    process.env.META_ACCESS_TOKEN &&
      process.env.IG_USER_ID &&
      process.env.FB_PAGE_ID &&
      process.env.INSTAGRAM_ACCOUNT_ID
  );
  const playwrightConfigured = Boolean(
    process.env.INSTAGRAM_USERNAME && process.env.INSTAGRAM_PASSWORD
  );
  const playwrightEnabled =
    playwrightConfigured && process.env.ENABLE_PLAYWRIGHT_FALLBACK === 'true';
  const agentSecretOk = Boolean(process.env.AGENT_SECRET);
  const aiOk = Boolean(process.env.ANTHROPIC_API_KEY);

  const mode = metaOk
    ? 'Meta Graph API (Mod 1)'
    : playwrightEnabled
      ? 'Playwright fallback (Mod 2 — önerilmez)'
      : 'Yapılandırılmadı';
  const textMode = aiOk
    ? 'Yapay zekâ (Claude) — her seferinde özgün metin'
    : 'Hazır konu havuzu (13 içerik, dönüşümlü)';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">Ayarlar</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Güvenlik gereği değerler gösterilmez; yalnızca dolu/boş durumu kontrol edilir.
      </p>

      <div className="mt-6 space-y-3">
        <Row label="Marka" ok detail="Araç Takip Paneli · Hedef: rent a car işletmeleri" />
        <Row
          label="Supabase bağlantısı"
          ok={supabaseOk}
          detail="NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY"
        />
        <Row
          label="Yapay zekâ metin üretimi (Claude)"
          ok={aiOk}
          detail="ANTHROPIC_API_KEY — boşsa hazır konu havuzu kullanılır (panel yine çalışır)"
        />
        <Row
          label="Meta Graph API (Mod 1 — önerilen)"
          ok={metaOk}
          detail="META_ACCESS_TOKEN, IG_USER_ID, FB_PAGE_ID, INSTAGRAM_ACCOUNT_ID"
        />
        <Row
          label="Playwright fallback (Mod 2)"
          ok={playwrightEnabled}
          detail={
            playwrightConfigured && !playwrightEnabled
              ? 'Bilgiler var ama kapalı — açmak için ENABLE_PLAYWRIGHT_FALLBACK=true'
              : 'INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD + ENABLE_PLAYWRIGHT_FALLBACK=true'
          }
        />
        <Row
          label="Zamanlanmış üretim anahtarı"
          ok={agentSecretOk}
          detail="AGENT_SECRET — cron ile otomatik içerik üretimi için (panel butonu bunsuz da çalışır)"
        />
      </div>

      <div className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3">
        <p className="text-sm">
          Aktif paylaşım modu: <span className="font-semibold text-blue-300">{mode}</span>
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Mod seçimi otomatik: Meta API bilgileri doluysa gerçek paylaşım Graph API
          ile yapılır (Mod 1). Meta yoksa ve Mod 2 açıksa Playwright fallback denenir.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Uyarı: Tarayıcı otomasyonu (Playwright) Instagram kullanım koşullarına aykırıdır,
        hesabın kısıtlanmasına yol açabilir ve Instagram arayüz değiştirirse bozulabilir.
        Mümkünse Meta Graph API kullanılmalıdır.
      </div>
    </div>
  );
}
