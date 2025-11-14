# Super Admin Dashboard API - Quick Reference Card

## Authentication Template

All requests require this header:
```
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

**JWT Requirements:**
- Role: `SUPER_ADMIN`
- At least one of these scopes per endpoint (see table below)
- Token expires: 10 minutes
- Refresh endpoint: `POST /oauth2/token` with refresh token

---

## API Endpoints at a Glance

### User Management (Platform Staff)

| Action | Endpoint | Method | Scope | Notes |
|--------|----------|--------|-------|-------|
| List all staff | `/api/v1/admin/users` | GET | `admin:users:read` | Sorted: MODERATOR first, then ANALYST |
| Create staff account | `/api/v1/admin/users` | POST | `admin:users:write` | Roles: MODERATOR or ANALYST only |
| Change staff role | `/api/v1/admin/users/{userId}/role` | PATCH | `admin:users:write` | Revokes existing tokens immediately |

**Create User Payload:**
```json
{
  "username": "moderator_name",
  "email": "mod@example.com",
  "role": "MODERATOR",
  "temporaryPassword": null
}
```

---

### Business Host Applications

| Action | Endpoint | Method | Scope | Notes |
|--------|----------|--------|-------|-------|
| List applications | `/api/v1/admin/business/applications?status=PENDING&page=0&size=20` | GET | `admin:users:read` | Status: PENDING, APPROVED, REJECTED |
| Review application | `/api/v1/admin/business/applications/{appId}` | PUT | `admin:users:write` | Irreversible: PENDING → APPROVED/REJECTED |

**Review Application Payload:**
```json
{
  "status": "APPROVED",
  "reviewNotes": "Documentation verified"
}
```

**Status Values:**
- `PENDING` - Awaiting review
- `APPROVED` - Applicant granted Host privileges
- `REJECTED` - Application denied

---

### Video Content Moderation

| Action | Endpoint | Method | Scope | Notes |
|--------|----------|--------|-------|-------|
| Get pending videos | `/api/v1/videos/check` | GET | `moderation:read` | Returns presigned URLs (15min) |
| Get video by ID | `/api/v1/videos/check/{videoId}` | GET | `moderation:read` | Single pending video |
| Approve/Reject video | `/api/v1/videos/check/{videoId}?status=APPROVED` | PUT | `moderation:write` | Parameter: status=APPROVED or REJECTED |

**Moderation Status Values:**
- `APPROVED` - Move to public, visible in feed
- `REJECTED` - Remove from moderation queue

---

### Platform Analytics

| Action | Endpoint | Method | Scope | Notes |
|--------|----------|--------|-------|-------|
| Get 24h summary | `/api/v1/analytics/summary` | GET | `analytics:read` | Returns approved, rejected, pending counts |

**Response:**
```json
{
  "approved_count": 1250,
  "rejected_count": 87,
  "pending_last_24h_count": 34
}
```

---

## Password Policy (When Creating Staff)

If you provide `temporaryPassword`, it must be:
- At least 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character: `!@#$%^&*()-_=+[]{}|;:',.<>?/`

**Example valid password:** `SecureP@ss123!`

If omitted, server generates one automatically.

---

## Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `400` | Validation error | Fix request body/parameters |
| `401` | Token expired/invalid | Refresh token using `/oauth2/token` |
| `403` | Missing role/scope | Contact admin for permissions |
| `404` | Resource not found | Verify ID is correct |
| `409` | State conflict | Check resource status (e.g., app already reviewed) |
| `429` | Rate limited | Wait and retry (see `X-RateLimit-Reset` header) |
| `500` | Server error | Contact support, check backend logs |

---

## cURL Examples (Copy & Paste)

### List Users
```bash
curl -X GET http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Create Moderator (auto-generate password)
```bash
curl -X POST http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "moderator_jane",
    "email": "jane@videosanity.local",
    "role": "MODERATOR"
  }'
```

### Change Role to ANALYST
```bash
curl -X PATCH http://localhost:8080/api/v1/admin/users/{userId}/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "ANALYST"}'
```

### List Pending Applications
```bash
curl -X GET "http://localhost:8080/api/v1/admin/business/applications?status=PENDING&page=0&size=20" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Approve Application
```bash
curl -X PUT "http://localhost:8080/api/v1/admin/business/applications/{appId}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "reviewNotes": "All docs verified"
  }'
```

### Get Pending Videos
```bash
curl -X GET http://localhost:8080/api/v1/videos/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Approve Video
```bash
curl -X PUT "http://localhost:8080/api/v1/videos/check/{videoId}?status=APPROVED" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

### Get Analytics Summary
```bash
curl -X GET http://localhost:8080/api/v1/analytics/summary \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

## JavaScript/TypeScript Fetch Examples

### Setup (reusable)
```javascript
const API_BASE = 'http://localhost:8080';

async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });

  if (response.status === 401) {
    // Token expired - refresh it
    await refreshAccessToken();
    return apiCall(endpoint, method, body); // Retry
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API error');
  }

  return response.json();
}
```

### List Users
```javascript
const users = await apiCall('/api/v1/admin/users');
console.log(users);
```

### Create Moderator
```javascript
const newMod = await apiCall('/api/v1/admin/users', 'POST', {
  username: 'moderator_alice',
  email: 'alice@videosanity.local',
  role: 'MODERATOR'
});
console.log(`New moderator ID: ${newMod.userId}`);
console.log(`Temporary password: ${newMod.temporaryPassword}`);
```

### Approve Application
```javascript
const appId = 'application-uuid-here';
const result = await apiCall(
  `/api/v1/admin/business/applications/${appId}`,
  'PUT',
  {
    status: 'APPROVED',
    reviewNotes: 'Great application, approved'
  }
);
console.log(`Application status: ${result.status}`);
```

### Get Analytics
```javascript
const analytics = await apiCall('/api/v1/analytics/summary');
console.log(`Approved videos: ${analytics.approved_count}`);
console.log(`Pending (24h): ${analytics.pending_last_24h_count}`);
```

---

## Pagination Pattern

For endpoints that return paginated results:

```javascript
// Get all applications across all pages
async function fetchAllApplications(status = 'PENDING') {
  let allApps = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await apiCall(
      `/api/v1/admin/business/applications?status=${status}&page=${page}&size=50`
    );

    allApps.push(...response.applications);
    hasMore = page < response.totalPages - 1;
    page++;
  }

  return allApps;
}
```

---

## Key Business Rules

### User Management
- ❌ Cannot create SUPER_ADMIN role
- ❌ Cannot modify SUPER_ADMIN roles
- ✅ At least 1 MODERATOR must remain active
- ✅ Role changes revoke existing access tokens immediately

### Host Applications
- ❌ Cannot review already-reviewed applications
- ✅ Status transition is irreversible: PENDING → APPROVED/REJECTED
- ✅ APPROVED grants user Host privileges (user_type = HOST)
- ✅ Review notes are optional but recommended

### Video Moderation
- ✅ APPROVED moves video to public storage
- ✅ REJECTED removes video from queue
- ✅ Presigned URLs expire after 15 minutes (refetch if 403)

### Rate Limiting
- 100 requests/minute per IP (unauthenticated)
- 200 requests/minute per user (authenticated)
- Wait time in `X-RateLimit-Reset` header

---

## Debugging Tips

### Token Expired?
Check `exp` claim (decode JWT at jwt.io):
```javascript
const token = localStorage.getItem('accessToken');
const decoded = JSON.parse(atob(token.split('.')[1]));
const isExpired = decoded.exp * 1000 < Date.now();
```

### Presigned URL Broken?
Videos are only available for 15 minutes. Refetch the video endpoint:
```javascript
// Get fresh presigned URL
const video = await apiCall(`/api/v1/videos/check/${videoId}`);
// Use video.presignedUrl
```

### Rate Limited?
Check header and wait:
```javascript
const response = await fetch(endpoint, options);
if (response.status === 429) {
  const resetTime = parseInt(response.headers.get('X-RateLimit-Reset')) * 1000;
  const waitMs = resetTime - Date.now();
  console.log(`Wait ${waitMs}ms before retrying`);
}
```

### Authorization Error (403)?
Check your JWT scopes match endpoint requirements:
```javascript
const decoded = JSON.parse(atob(token.split('.')[1]));
console.log('Scopes:', decoded.scope);
// Should include endpoint's required scope
```

---

## Response Headers

### Standard Headers
```
Content-Type: application/json
X-Request-ID: unique-request-id
X-Powered-By: Spring Boot 3.5.5
```

### Rate Limit Headers (all requests)
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1634192000
```

### Auth Headers (POST/PATCH/PUT)
```
X-Forwarded-For: client-ip (optional, for audit logging)
User-Agent: client-identifier (optional, for audit logging)
```

---

## Data Types Quick Reference

**Enums:**
- `ApplicationStatus` - PENDING, APPROVED, REJECTED
- `PlatformRoles` - MODERATOR, ANALYST, SUPER_ADMIN
- `UsersTypes` - CUSTOMER, HOST
- `VideoStatus` - PENDING, APPROVED, REJECTED
- `BusinessCategory` - RESTAURANT, HOTEL
- `PriceRange` - BUDGET ($), MODERATE ($$), UPSCALE ($$$), LUXURY ($$$$)

**Common Fields:**
- `UUID` - 36-char format: `550e8400-e29b-41d4-a716-446655440000`
- `ISO 8601 Timestamp` - `2024-11-14T09:30:00Z`
- `URL` - S3 presigned URL starts with protocol (http/https)

---

## Support & Documentation

- **Full API Docs:** `SUPER_ADMIN_DASHBOARD_API.md` (this directory)
- **Security Details:** `SECURITY_IMPLEMENTATION.md`
- **Role System:** `ROLES.md`
- **Architecture:** `CLAUDE.md`
- **Backend Setup:** `docker-compose up`
- **Test Credentials:** See `DevSecurityDataInitializer` in source code

---

**Last Updated:** 2024-11-14
**API Version:** 1.0
**Format Version:** Quick Reference 1.0
