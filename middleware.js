import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/security';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const isAdminPage = pathname.startsWith('/admin') && pathname !== '/admin';

  const isAdminApiWrite =
    pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    !pathname.startsWith('/api/auth/login') &&
    !pathname.startsWith('/api/inquiries') &&
    !pathname.startsWith('/api/reviews') &&
    !pathname.startsWith('/api/push') &&
    !pathname.startsWith('/api/chat');

  if (!isAdminPage && !isAdminApiWrite) return NextResponse.next();

  const session = request.cookies.get(ADMIN_COOKIE)?.value;
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin';
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
