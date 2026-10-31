import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy
 * Allows all pages, assets, and API routes to function normally without blocking or rewriting to countdown.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. API routes & payment create-order rewrite
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  if (pathname === '/payments/create-order') {
    return NextResponse.rewrite(new URL('/api/payments/create-order', request.url));
  }

  // 2. Allow Next.js internals, static files, and assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.png' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.(.*)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 3. Canonical URL redirects
  if (pathname === '/home') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  if (pathname === '/organizer') {
    return NextResponse.redirect(new URL('/organizers', request.url));
  }
  if (pathname === '/package') {
    return NextResponse.redirect(new URL('/packages', request.url));
  }

  // 4. All pages are unblocked and served directly
  return NextResponse.next();
}

// Default export alias for compatibility
export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
