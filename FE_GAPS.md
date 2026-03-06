# FE Moderator — Production Gaps

> Deploying on **Vercel Hobby (free tier)** as MVP.

---

## 🔴 Critical — Must Fix Before Deploy

### 1. Rename `src/proxy.ts` → `src/middleware.ts` ✅ Done

Next.js only picks up middleware from `middleware.ts` at the project or `src/` root. Currently named `proxy.ts`, so **HSTS, CSP, X-Frame-Options, and route protection are not applied**.

- Rename `src/proxy.ts` → `src/middleware.ts`
- Export the handler as `middleware` (not `proxy`)
- Keep the existing `config` matcher export
- Verify middleware runs on Vercel Edge Runtime (no Node.js-only APIs in middleware)

**Resolution:**
- Renamed `src/proxy.ts` → `src/middleware.ts`
- Changed export from `proxy` to `middleware`
- Kept existing `config` matcher unchanged
- Verified: middleware uses only `NextRequest`/`NextResponse` and `request.cookies` — all Edge-compatible, no Node.js-only APIs
- Build confirmed: `next build` output shows `ƒ Proxy (Middleware)` — Next.js now detects and applies the middleware

---

### 2. Fix `constantTimeEqual` — Timing Attack on CSRF ✅ Done

`crypto.ts` uses `Buffer.equals()` which is **not constant-time**. The early return on length mismatch also leaks information.

```diff
-import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes } from 'crypto';
+import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from 'crypto';

 export const constantTimeEqual = (a: string, b: string): boolean => {
-  const bufferA = Buffer.from(a);
-  const bufferB = Buffer.from(b);
-  if (bufferA.length !== bufferB.length) {
-    return false;
-  }
-  return bufferA.equals(bufferB);
+  const bufferA = Buffer.from(a, 'utf8');
+  const bufferB = Buffer.from(b, 'utf8');
+  if (bufferA.length !== bufferB.length) {
+    // Hash both to fixed-length to avoid timing leak on length
+    const hashA = createHash('sha256').update(bufferA).digest();
+    const hashB = createHash('sha256').update(bufferB).digest();
+    return timingSafeEqual(hashA, hashB);
+  }
+  return timingSafeEqual(bufferA, bufferB);
 };
```

**Resolution:**
- Added `timingSafeEqual` to `crypto` import in `src/lib/auth/crypto.ts`
- Replaced `Buffer.equals()` with `crypto.timingSafeEqual()` for equal-length buffers
- Length-mismatch case now hashes both inputs to fixed-length SHA-256 digests before comparing — eliminates timing leak on string length
- All 44 tests pass including `constantTimeEqual` tests in `crypto.test.ts`

---

### 3. Production Environment Variables

Set these in **Vercel Dashboard → Settings → Environment Variables**:

| Variable | Value | Notes |
|---|---|---|
| `AUTH_SERVER_BASE_URL` | `https://your-backend.com` | Your VPS backend URL |
| `AUTH_CLIENT_ID` | `frontend-client` | Must match backend OAuth client |
| `AUTH_COOKIE_SECRET` | *(random 32+ chars)* | `openssl rand -hex 32` to generate |
| `AUTH_SCOPE` | `moderation:read moderation:write analytics:read` | |
| `BACKEND_API_BASE_URL` | `https://your-backend.com` | Same as auth server |
| `NEXT_PUBLIC_API_BASE_URL` | `https://your-backend.com/api/v1` | Client-visible |
| `NEXT_PUBLIC_MEDIA_CDN_URL` | `https://your-minio-domain.com` | Or S3/CDN URL |
| `NEXT_PUBLIC_APP_URL` | `https://your-vercel-app.vercel.app` | For OAuth redirect URI |

> [!CAUTION]
> `AUTH_COOKIE_SECRET` must be cryptographically random. The current `dev-only-change-me` value will compromise all encrypted session cookies.

---

### 4. Add Startup Env Validation ✅ Done

The app currently only throws when `getAuthConfig()` is first called (on user request), not at build/startup. Add validation.

Create `src/lib/env-check.ts`:
```typescript
const required = ['AUTH_CLIENT_ID', 'AUTH_COOKIE_SECRET'];

export const validateEnv = () => {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
};
```

Call from `next.config.ts` or the root layout server component.

**Resolution:**
- Created `src/lib/env-check.ts` — validates `AUTH_CLIENT_ID` and `AUTH_COOKIE_SECRET` are present and non-empty
- Skips during `phase-production-build` (Vercel injects env vars at runtime, not build time)
- Called from `src/app/layout.tsx` (Server Component) — runs on every server-side request, catches missing vars immediately instead of on first auth request

---

### 5. Update `next.config.ts` — Production Image Domains ✅ Done

Replace localhost MinIO domain with production CDN:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'lh3.googleusercontent.com',
    },
    {
      protocol: 'https',
      hostname: process.env.NEXT_PUBLIC_MEDIA_CDN_HOST ?? 'your-minio-domain.com',
    },
  ],
},
```

**Resolution:**
- Updated `next.config.ts` — image domains now driven by `NEXT_PUBLIC_MEDIA_CDN_HOST` env var
- When `NEXT_PUBLIC_MEDIA_CDN_HOST` is set: uses `https` with that hostname (production)
- When not set: falls back to `http://localhost:9000` (local dev with MinIO)
- No more hardcoded localhost in production builds

---

## 🟡 High Priority — Should Fix Before Deploy

### 6. Fix Root Layout — Convert to Server Component ✅ Done

`layout.tsx` is `'use client'`, disabling SSR for the entire app. This increases bundle size and breaks metadata.

- Remove `'use client'` from `layout.tsx`
- Move `usePathname()` logic into a client `<HeaderWrapper />` component
- Add `metadata` export for title/description

```typescript
// layout.tsx (Server Component)
export const metadata = {
  title: 'Moderator Dashboard',
  description: 'Internal moderation panel',
};
```

**Resolution:**
- Created `src/components/ui/HeaderWrapper.tsx` — client component that uses `usePathname()` to conditionally render `<Header />` on `/dashboard`, `/analytics`, `/super-admin` routes
- Converted `src/app/layout.tsx` to Server Component — removed `'use client'`, replaced `usePathname()` with `<HeaderWrapper />`, added `Metadata` type export with title and description
- Build verified: `next build` compiles successfully with no errors

---

### 7. Add Rate Limiting on Auth Endpoints ✅ Done

No rate limiting on `/api/auth/login` allows credential brute-force.

**Options for Vercel Hobby:**
- Use Vercel KV (free tier: 3K requests/day) with `@upstash/ratelimit`
- Or rely on backend rate limiting (your Spring Boot already has Bucket4j)
- At minimum: add a simple in-memory counter per IP in the login route (resets on cold starts, but better than nothing)

**Resolution:**
- Created `src/lib/auth/rate-limit.ts` — in-memory sliding-window rate limiter (10 attempts per 15 minutes per IP)
- Integrated into `src/app/api/auth/login/route.ts` — checks rate limit at the top of the POST handler, returns `429` with `Retry-After` header when exceeded
- IP resolved from `x-forwarded-for` (Vercel sets this) or `x-real-ip` fallback
- Resets on cold starts (acceptable for MVP, swap to Upstash for persistence later)

---

### 8. Add Health Check Endpoint ✅ Done

Create `src/app/api/health/route.ts`:
```typescript
export const GET = () => Response.json({ status: 'ok' });
```

Useful for uptime monitoring (UptimeRobot, etc.).

**Resolution:**
- Created `src/app/api/health/route.ts` — returns `{ status: 'ok', timestamp: '...' }` on GET

---

### 9. Remove Debug Logging ✅ Done

`server-client.ts` line 44 logs auth payloads:
```typescript
console.log('[auth] authorize payload', JSON.stringify({...}));
```

Remove or gate behind `NODE_ENV !== 'production'`. Vercel logs are accessible but shouldn't contain auth metadata.

**Resolution:**
- Removed the `console.log('[auth] authorize payload', ...)` block from `src/lib/auth/server-client.ts`

---

## 🟢 Medium Priority — Polish

### 10. CSP — Replace `unsafe-inline` with Nonces

Current CSP allows `script-src 'self' 'unsafe-inline'`, which weakens XSS protection.

Use Next.js `nonce` support:
- Generate nonce in middleware
- Pass via `x-nonce` header
- Reference in CSP: `script-src 'self' 'nonce-${nonce}'`

---

### 11. Silent Error Handling in Services ✅ Done

`video-service.ts` and others silently return `[]` on failure. Users see empty state with no indication of error.

Add error state handling in dashboard components (toast, retry button, or error boundary).

**Resolution:**
- Added `VideoServiceError` class to `src/services/video-service.ts` with status code and error code fields
- All 6 service functions (`getPendingVideos`, `getModeratedVideos`, `getVideoById`, `addComment`, `updateVideoStatus`) now throw `VideoServiceError` instead of silently returning empty arrays/null
- Removed duplicate `getAnalyticsSummary` from `video-service.ts` (already exists in `analytics-service.ts`)
- Fixed `src/app/analytics/page.tsx` import to use `analytics-service` instead of `video-service`
- Updated `src/app/dashboard/page.tsx` — added `fetchError` state, red error banner with retry button when video fetch fails

---

### 12. Add Core Tests ✅ Done

Priority test targets:
- `crypto.ts` — encrypt/decrypt roundtrip, `constantTimeEqual`
- `jwt.ts` — `mapSessionDetails` with various token shapes
- `url.ts` — `sanitizeReturnTo` (open redirect prevention)
- `tokens.ts` — cookie setting/clearing

Add to `package.json`:
```json
"vitest": "^3.0",
"@testing-library/react": "^16.0"
```

**Resolution:**
- Installed `vitest` as dev dependency, created `vitest.config.ts` with `@` path alias
- Added `test` and `test:watch` scripts to `package.json`
- Created 4 test files, **44 tests all passing**:
  - `src/lib/auth/crypto.test.ts` (15 tests) — encrypt/decrypt roundtrip (string, JSON, unicode), random IV uniqueness, wrong-secret rejection, malformed payload, HMAC signing, constant-time equality
  - `src/lib/auth/jwt.test.ts` (11 tests) — session mapping for moderator/analyst/super-admin roles, expired tokens, identity permission override, password rotation, comma-separated roles, array scopes
  - `src/lib/auth/url.test.ts` (13 tests) — open redirect prevention (absolute URLs, protocol-relative, javascript:), valid path preservation, redirect URI resolution
  - `src/lib/auth/rate-limit.test.ts` (5 tests) — under-limit allow, over-limit block, remaining count, key isolation, window expiry

---

## Vercel Hobby Tier — Things to Know

| Constraint | Limit | Impact |
|---|---|---|
| Serverless function timeout | **10 seconds** | Auth proxy calls to backend must complete within 10s |
| Bandwidth | **100 GB/month** | Video streaming should NOT go through Vercel — serve presigned URLs directly from MinIO/S3 |
| Builds | **6,000 min/month** | Fine for MVP |
| Edge Middleware | ✅ Supported | Middleware runs on Edge, ensure no Node.js-only imports |
| Custom domains | ✅ 1 free | Set up for OAuth redirect URI |
| Environment variables | ✅ Supported | Set via dashboard, not `.env` files |
| Analytics | ❌ Not on Hobby | Use external monitoring |
| Password protection | ❌ Not on Hobby | App must handle its own auth (already does) |
| DDoS protection | ✅ Basic included | Vercel provides basic DDoS protection |

> [!IMPORTANT]
> **Video presigned URLs must point directly to your MinIO/S3**, not proxied through Vercel. The 10s function timeout and 100GB bandwidth cap mean video content must bypass the BFF entirely. The current `VideoPlayer` component fetches `presignedUrl` from the API response — ensure that URL points to your storage domain, not the Vercel app.

---

## Backend (VPS) Checklist

Since the backend deploys on a separate VPS, ensure:

- [ ] Backend CORS allows `https://your-vercel-app.vercel.app` (or your custom domain)
- [ ] OAuth client `frontend-client` has redirect URI set to `https://your-app.vercel.app/api/auth/callback`
- [ ] `__Host-vsanity-refresh` cookie domain is compatible with cross-origin BFF ↔ backend setup
- [ ] Backend is accessible via HTTPS (TLS cert via Let's Encrypt / Caddy)
- [ ] MinIO/S3 presigned URLs use HTTPS and are accessible from the browser
