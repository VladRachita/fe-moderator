# fe-moderator

Moderation dashboard built on Next.js 15 with a secure BFF layer that brokers OAuth2 PKCE logins against the Spring WebFlux backend.

## Environment

Create an `.env.local` with the following values before running the app:

```
AUTH_SERVER_BASE_URL=http://localhost:8080
AUTH_CLIENT_ID=frontend-client
AUTH_COOKIE_SECRET=dev-only-change-me
AUTH_SCOPE=moderation:read moderation:write analytics:read admin:users:read admin:users:write
BACKEND_API_BASE_URL=http://localhost:8080
```

`AUTH_COOKIE_SECRET` must be at least 32 characters and unique per deployment. Override `AUTH_REDIRECT_URI` or `APP_URL` when hosting behind a reverse proxy.

## Development

- `npm install`
- `npm run dev`

Accessing protected routes (e.g., `/dashboard`) without a valid session redirects to `/login`, where moderators authenticate with corporate credentials. The form calls `/api/auth/login`, which runs the PKCE authorize + token exchange sequence and returns an encrypted access cookie plus the backend-issued `__Host-vsanity-refresh` cookie.

## Security Features

- HttpOnly Secure cookies for access tokens (encrypted) and backend-managed refresh tokens (`__Host-vsanity-refresh`) rotated on every refresh.
- Anti-CSRF protection via double-submit cookie (`mod_csrf_token`).
- Centralized proxy under `/api/proxy/*` that forwards requests to the backend with automatic token refresh and hardened headers via `middleware.ts`.
- Comprehensive logout handler at `/api/auth/logout` that revokes access and refresh tokens server-side.
