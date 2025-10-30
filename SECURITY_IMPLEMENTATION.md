# 🔒 Secure Authentication & Authorization Implementation Plan

### 📘 Overview
This document defines the **secure authentication and authorization design** for our platform.

**Tech stack:**
- **Frontend:** Next.js (TypeScript, BFF pattern)
- **Backend:** Kotlin + Spring Boot (WebFlux)
- **Database:** Existing production-grade DB (for users, clients, sessions, and audits)
- **Users:** Internal only (moderators, analysts, and super admins).  
  _No self-registration or user creation via UI._

---

## 🧭 1. Architecture Overview

### 🔒 Hardening — General (Architecture & Ops) — 2025-10-09

- **Split critical roles (AuthZ Server vs Resource API)**
  - *Good:* Separate repos/pipelines/runtimes/keys/logs; distinct on-call and incident runbooks; narrow network paths.
  - *Verify:* API cannot mint tokens; AuthZ outage does not break token validation; issuance vs verification keys isolated; cross-plane access default-deny; separate alerting.
- **Session lifecycle**
  - *Good:* Idle + absolute timeouts; device/session inventory UI; server-side invalidate; rotate IDs on login/privilege elevation/sensitive actions; step-up for privileged tasks.
  - *Verify:* Expiries enforced; revoke kills access across devices within SLA; identifiers rotate; step-up logged and required for high-risk actions.
- **Data protection & recoverability**
  - *Good:* Encrypt sensitive columns with centralized KMS; limit key usage by service identity; immutable/tamper-evident audit logs; routine backup + restore tests.
  - *Verify:* Keys non-exportable; plaintext access gated by policy; audit logs append-only and access-audited; DR restore meets RPO/RTO.

                Browser (Internal Users)
                         |
                         v
     +-----------------------------------+
     |        Next.js (TypeScript BFF)   |
     |-----------------------------------|
     | - /api/auth/* (OAuth2 handlers)   |
     | - SSR / API proxy routes          |
     | - HttpOnly Secure cookies         |
     +--------------------▲--------------+
                          |  (HTTPS)
                          v
     +-----------------------------------+
     | Kotlin + Spring WebFlux Backend   |
     |-----------------------------------|
     | - OAuth2 Authorization Server     |
     | - Resource Server (JWT)           |
     | - User DB (moderators/analysts/super admins) |
     | - Audit + Session persistence     |
     +-----------------------------------+

     ---

## 🔁 2. Shared Communication Schema

### OAuth2 PKCE Flow (Mermaid Diagram)

#### mermaid sequenceDiagram

    participant B as Browser (User)
    participant F as Next.js BFF (Frontend)
    participant S as Spring WebFlux Backend (Auth + API)

    B->>F: 1️⃣ Request /api/auth/login
    F->>S: 2️⃣ Redirect user to /oauth2/authorize (with PKCE challenge)
    B->>S: 3️⃣ User authenticates (credentials)
    S-->>B: 4️⃣ Redirect back to /api/auth/callback?code=XYZ
    B->>F: 5️⃣ Sends authorization code
    F->>S: 6️⃣ Exchange code + verifier for access & refresh tokens
    S-->>F: 7️⃣ Returns tokens (JWT + refresh token)
    F->>B: 8️⃣ Sets HttpOnly Secure refresh cookie
    B->>F: 9️⃣ Requests /api/data
    F->>S: 🔟 Forwards request with Authorization: Bearer <access_token>
    S-->>F: ✅ Returns protected resource
    F-->>B: ✅ Sends processed response

## 🖥️ FRONTEND — Next.js (TypeScript BFF)

### 🎯 Objectives
	•	Provide secure, server-side authentication layer for internal users.
	•	Never expose tokens to client-side JavaScript.
	•	Manage PKCE flow and token refresh logic.
	•	Proxy all API requests securely through the BFF.

### ⚙️ Implementation Plan

#### 🔒 Hardening — Frontend (Next.js) — 2025-10-09

- **CSP & critical headers**
  - *Good:* Nonce-based `script-src`; define `frame-ancestors` in CSP; enable COOP/COEP/CORP where compatible; `Cache-Control: no-store` on sensitive responses; start in report-only.
  - *Verify:* Scripts without nonce blocked; app cannot be framed by foreign origins; cross-origin isolation headers present; sensitive pages not cached; CSP violation reports visible.

A. Authentication Flow
	1.	/api/auth/login
	•	Generate PKCE verifier + challenge.
	•	Redirect user to backend /oauth2/authorize.
	2.	/api/auth/callback
	•	Receive authorization code.
	•	Exchange code + verifier at /oauth2/token.
	•	Store access token in server memory and refresh token in HttpOnly cookie.
	3.	/api/auth/refresh
	•	Use refresh token to get a new access token.
	•	Rotate refresh token on each refresh.
	4.	/api/auth/logout
	•	Call /oauth2/revoke endpoint on backend.
	•	Delete cookies and session.
	•	Redirect to login page.

B. Token & Cookie Management

Access Token - Server memory/session - Short-lived (≈10 min)
Refresh Token - HttpOnly Secure Cookie - Rotated regularly (7 days lifespan)
Cookie attributes:
	•	HttpOnly
	•	Secure
	•	SameSite=Lax
	•	Path=/
	•	Domain=app.example.com

🚫 Never use localStorage or readable cookies for any token.

C. Proxy & Data Access
	•	All /api/* routes from browser go through BFF API routes.
	•	BFF attaches Authorization: Bearer <access_token> to backend calls.
	•	On 401 responses, BFF triggers refresh flow automatically.

D. CSRF & CORS
	•	Use double-submit cookie or Synchronizer Token for state-changing requests.
	•	CORS allowed only for backend origin: https://api.example.com.
	•	Browser never contacts backend directly — only through the BFF.

E. Security Headers

Add via Next.js middleware:
	•	Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
	•	Content-Security-Policy: default-src 'self'
	•	X-Frame-Options: DENY
	•	X-Content-Type-Options: nosniff
	•	Referrer-Policy: strict-origin-when-cross-origin
	•	Permissions-Policy: disable unnecessary browser APIs.

## Frontend Implementation Status

- **PKCE + session handlers:** `/api/auth/login` performs the PKCE dance against `/oauth2/authorize`, `/api/auth/refresh` rotates credentials, and `/api/auth/logout` revokes refresh tokens before clearing cookies—matching sections A and B.
- **Encrypted session storage:** The access token is stored only as AES-GCM encrypted cookie (`mod_access_token`) plus volatile in-memory state. The backend-issued `__Host-vsanity-refresh` cookie is forwarded untouched, keeping all tokens out of `localStorage` / readable cookies.
- **Identifier validation:** The login form accepts either an email address or username, trims input before submission, rejects unsafe characters via regex, and forwards the exact identifier to `/api/auth/login` so the backend can normalise it. Session records and redirects continue to use the resolved email from `/api/v1/me`.
- **Identity resolution via `/api/v1/me`:** After each login or refresh the BFF calls `/api/v1/me`, which now returns `{ authenticated, userId, clientId, role, roles, identityKey, permissions, needsPasswordChange }`. We persist only those fields in memory, normalise the `roles` array (including `ROLE_SUPER_ADMIN`) for downstream guards, and drop legacy `superAdminProfile` / stringly scopes to reduce data leakage.
- **Permission-driven UI:** The frontend consumes `permissions.canModerate` / `.canViewAnalytics` / `.canManageUsers` exclusively for gating dashboards and actions (including the `/super-admin` console). Pages never render raw scope or role strings, identity switches (tracked by `identityKey`) purge cached moderator/analyst state before refetching, and navigation suppresses privileged links whenever `needsPasswordChange` is true.
- **Super-admin provisioning safeguards:** The `/super-admin` (“Platform Users”) page requests the expanded `admin:users:*` scopes, validates moderator/analyst role selection, and calls the provision API through the BFF. Temporary passwords are rendered once per action (never stored in local/session storage), can be dismissed instantly, and UX copy reinforces immediate credential rotation. Provisioning also enforces a 3–80 character username policy (`[A-Za-z0-9._-]`) and trims emails before submission.
- **Staff roster controls:** Super admins can list active moderators and analysts via `/api/v1/admin/users`, with the UI enforcing admin scopes, surfacing rotation-required badges, and requiring confirmation before PATCHing roles. Optimistic updates roll back on validation failures while the underlying BFF refreshes state to match backend audits, and a manual refresh action re-syncs the roster. Role changes immediately revoke the target user’s access tokens.
- **Default scope bundle:** `/api/auth/login` now defaults to requesting moderation, analytics, and admin scopes when no explicit `returnTo` is supplied so super-admin capabilities remain available post sign-in; destination hints still tailor the scope set as needed.
- **Password rotation enforcement:** Session payloads carry `needsPasswordChange`; any user flagged by the backend is redirected to `/account/password`, where the rotation flow enforces the shared complexity policy client-side before PATCHing `/api/v1/account/password`. Successful rotations refresh identity state before restoring dashboard access.
- **Defence-in-depth proxy:** All backend traffic funnels through `/api/proxy/*`, which enforces CSRF via double-submit cookie, auto-refreshes access tokens on 401, strips hop-by-hop headers, and rehydrates session cookies only after the `/me` call succeeds.
- **Security middleware:** `src/middleware.ts` injects HSTS, CSP, COOP/COEP/CORP, and guards protected routes (`/dashboard`, `/analytics`) to require a valid access cookie, satisfying section E.
- **Coordinated logout:** A BroadcastChannel + storage fallback notifies every tab to wipe the volatile session, clear identity-scoped caches, and redirect to `/login` with informative messaging when logout or token revocation occurs.
- **Client integration:** The login screen launches the OAuth flow, protected pages redirect unauthenticated users to `/login`, and the axios client supplies CSRF headers, reacts to 401s, and emits session-refresh events so React state stays harmonised.

---

## Backend Test Harness Requirements

To validate the frontend’s PKCE-based session flow against the Spring WebFlux backend, please provide the following endpoints and behaviours on `http://localhost:8080`.

### OAuth2 Authorization Server
- `/oauth2/authorize` must accept PKCE challenges (`code_challenge_method=S256`), allow client `frontend-client`, and permit redirect URI `http://localhost:3000/api/auth/callback` (or the configured `AUTH_REDIRECT_URI`).
- `/oauth2/token` should return short-lived JWT access tokens plus refresh tokens, rotating the refresh token on every exchange. Include scopes such as `moderation:read` and `moderation:write` along with role claims.
- `/oauth2/revoke` needs to invalidate both access and refresh tokens so logout from the frontend clears every device session.
- Provide test moderator credentials for interactive login during development.

### Resource API Contract
- All moderation endpoints (`/api/v1/videos/check/*`) should require `Authorization: Bearer <access_token>` and verify scopes/roles.
- All analytics endpoints ( `/api/v1/analytics/*`) should require `Authorization: Bearer <access_token>` and verify scopes/roles.
- Return HTTP 401 for expired or invalid tokens so the BFF can trigger refresh; return HTTP 403 for authorization failures.
- Keep response bodies JSON-encoded; include an `error` field when requests fail so the UI can surface human-readable feedback.

### Token Specification
- Access tokens: JWT, signed with asymmetric keys exposed via JWKS for the resource service. TTL ≈ 10 minutes.
- Refresh tokens: opaque or JWT, single-use rotation with TTL ≈ 7 days. Include enough metadata to revoke across devices.
- Support the `refresh_token` grant type and honour the requested scopes.

### Operational Notes
- CORS is optional for the resource APIs because requests originate from the Next.js BFF, but ensure the endpoints are reachable from `http://localhost:3000`.
- Log token issuance, refresh, revocation, and authorization denials so the frontend team can trace flows while testing.
- Surface metrics or audit events for step-up authentication when implemented downstream.

With these pieces in place, developers can run `npm run dev` on the frontend and exercise the full login → proxy → refresh → logout lifecycle locally.
