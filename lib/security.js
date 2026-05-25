import { NextResponse } from 'next/server';

export const ADMIN_COOKIE = 'sethi_admin_session';
const WINDOW_MS = 60 * 1000;
const buckets = new Map();

export function makeAdminToken() {
  return `${Date.now()}.${crypto.randomUUID()}`;
}

export function setAdminCookie(response, token) {
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export function clearAdminCookie(response) {
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export function hasAdminCookie(request) {
  return Boolean(request.cookies?.get(ADMIN_COOKIE)?.value);
}

export function rateLimit(request, key, limit = 60) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  const id = `${key}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(id) || { count: 0, resetAt: now + WINDOW_MS };
  if (bucket.resetAt < now) {
    bucket.count = 0;
    bucket.resetAt = now + WINDOW_MS;
  }
  bucket.count += 1;
  buckets.set(id, bucket);
  if (bucket.count > limit) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429 });
  }
  return null;
}

export function requireAdmin(request) {
  if (hasAdminCookie(request)) return null;
  return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
}
