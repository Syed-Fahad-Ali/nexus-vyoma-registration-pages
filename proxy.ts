import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy
 * Keeps /organizer, /home, and /contact active.
 * Ensures all /api/* routes are completely unblocked and untouched.
 * Rewrites all other page routes to show the event countdown.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. NEVER block or touch any API route
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
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

  // 3. Keep / and /home active
  if (pathname === '/') {
    return NextResponse.next();
  }
  if (pathname === '/home') {
    return NextResponse.rewrite(new URL('/', request.url));
  }

  // 4. Keep /organizer and /organizers active
  if (pathname === '/organizer') {
    return NextResponse.redirect(new URL('/organizers', request.url));
  }
  if (pathname === '/organizers' || pathname.startsWith('/organizers/')) {
    return NextResponse.next();
  }

  // 5. Keep /contact active
  if (pathname === '/contact' || pathname.startsWith('/contact/')) {
    return NextResponse.next();
  }

  // 6. Direct access to /countdown
  if (pathname === '/countdown') {
    return NextResponse.next();
  }

  // 7. Apart from /organizer, /home, /contact:
  // All other pages must show the event countdown
  return NextResponse.rewrite(new URL('/countdown', request.url));
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

