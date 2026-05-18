import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

describe('proxy (Next.js 16 middleware) — Next-Action probe rejection', () => {
  it('returns 400 for POST with Next-Action header (bot probe)', () => {
    const req = new NextRequest('https://example.com/dashboard', {
      method: 'POST',
      headers: { 'next-action': '1' },
    });
    const res = proxy(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for POST with any Next-Action value (matches "x" too)', () => {
    const req = new NextRequest('https://example.com/super-admin', {
      method: 'POST',
      headers: { 'next-action': 'x' },
    });
    const res = proxy(req);
    expect(res.status).toBe(400);
  });

  it('does NOT 400 GET requests even with Next-Action header', () => {
    // Hardening: only POSTs invoke Server Actions in Next.js; a GET with this
    // header is malformed but shouldn't be treated as a probe. Falls through
    // to the rest of the proxy logic (CSP / auth-redirect).
    const req = new NextRequest('https://example.com/', {
      method: 'GET',
      headers: { 'next-action': '1' },
    });
    const res = proxy(req);
    expect(res.status).not.toBe(400);
  });

  it('passes through POSTs without Next-Action header (other proxy logic still applies)', () => {
    const req = new NextRequest('https://example.com/', { method: 'POST' });
    const res = proxy(req);
    expect(res.status).not.toBe(400);
  });

  it('400s a Next-Action POST to a protected path BEFORE the auth-redirect check', () => {
    // A probe to /dashboard with Next-Action should be 400'd directly, not
    // redirected to /login. Without this ordering the proxy would emit a
    // 307 redirect that still pollutes logs and wastes the auth check.
    const req = new NextRequest('https://example.com/dashboard', {
      method: 'POST',
      headers: { 'next-action': '1' },
    });
    const res = proxy(req);
    expect(res.status).toBe(400);
    // Confirm it is NOT a redirect to /login
    expect(res.headers.get('location')).toBeNull();
  });
});
