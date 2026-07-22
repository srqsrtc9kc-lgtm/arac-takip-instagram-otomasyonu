/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Görsel üretimi (Adım 7) için gerekli:
    // - @resvg/resvg-js native modüldür, satori wasm içerir;
    //   webpack'e paketlenmez, node_modules'ten çalışır.
    serverComponentsExternalPackages: ['@resvg/resvg-js', 'satori'],
    // - Vercel'de font dosyaları /api/image fonksiyon paketine dahil edilir.
    outputFileTracingIncludes: {
      '/api/image': ['./assets/fonts/**/*'],
    },
  },
};

export default nextConfig;
