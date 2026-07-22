import { NextRequest, NextResponse } from 'next/server';

function unauthorized(message = 'Bu panel için giriş gerekli.') {
  return new NextResponse(message, {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Araç Takip Paneli", charset="UTF-8"' },
  });
}

/**
 * Panel ve yazma API'leri HTTP Basic Auth ile korunur.
 * Vercel Cron GET /api/generate çağrısı kendi CRON_SECRET kontrolüne sahiptir.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/api/generate' && request.method === 'GET') {
    return NextResponse.next();
  }

  const expectedUser = process.env.PANEL_ADMIN_USER;
  const expectedPassword = process.env.PANEL_ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    if (process.env.NODE_ENV === 'development') return NextResponse.next();
    return new NextResponse(
      'Panel güvenlik ayarı eksik: PANEL_ADMIN_USER ve PANEL_ADMIN_PASSWORD tanımlayın.',
      { status: 503 }
    );
  }

  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Basic ')) return unauthorized();

  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(':');
    const user = separator >= 0 ? decoded.slice(0, separator) : '';
    const password = separator >= 0 ? decoded.slice(separator + 1) : '';
    if (user === expectedUser && password === expectedPassword) {
      // Tarayıcıdan gelen yazma isteklerinde farklı origin'i reddet.
      // Origin başlığı olmayan CLI/Vercel çağrıları Basic Auth kontrolünden geçer.
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
        const origin = request.headers.get('origin');
        if (origin && origin !== request.nextUrl.origin) {
          return NextResponse.json({ error: 'Farklı kaynaktan yazma isteği reddedildi.' }, { status: 403 });
        }
      }
      return NextResponse.next();
    }
  } catch {
    // Geçersiz Base64 aşağıda reddedilir.
  }
  return unauthorized('Kullanıcı adı veya şifre yanlış.');
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
