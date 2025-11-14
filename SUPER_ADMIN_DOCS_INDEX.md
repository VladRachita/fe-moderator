# Super Admin Dashboard Documentation - Complete Index

## Document Overview

This directory contains comprehensive documentation for building the videoSanity Super Admin Dashboard. All endpoints are fully documented with security requirements, validation rules, example payloads, and implementation patterns.

---

## Documentation Files

### 1. SUPER_ADMIN_DASHBOARD_API.md (Primary Reference - 1454 lines, 44KB)

**Use this when:** You need complete, detailed specifications for any endpoint

**Contents:**
- Full authentication & authorization specifications
- 8 endpoints with detailed documentation each
- Request/response schemas with all field descriptions
- Validation rules and error codes
- Real-world example payloads and cURL commands
- Audit logging details
- Rate limiting specifications
- Frontend implementation patterns (JavaScript/TypeScript)
- Security best practices

**Sections:**
1. Authentication & Authorization (JWT, scopes, claims)
2. User Management (3 endpoints)
   - List internal users
   - Create internal user
   - Update internal user role
3. Business Host Applications (2 endpoints)
   - List host applications with pagination
   - Review (approve/reject) applications
4. Video Content Moderation (3 endpoints)
   - Get all pending videos
   - Get video by ID
   - Update video moderation status
5. Platform Analytics & Metrics (1 endpoint)
   - Get 24-hour analytics summary
6. Audit & Security
7. Error Handling
8. Implementation Guide for Frontend

---

### 2. SUPER_ADMIN_API_QUICK_REFERENCE.md (Quick Lookup - 412 lines, 11KB)

**Use this when:** You need to quickly look up an endpoint or copy a cURL command

**Contents:**
- One-page quick lookup tables
- All 8 endpoints at a glance
- Copy-paste cURL examples for every endpoint
- JavaScript/TypeScript fetch examples
- Common error codes with actions
- Password policy requirements
- Pagination pattern code
- Debugging tips
- Business rules checklist

**Best for:**
- Quick reference while coding
- Finding the right cURL command
- Debugging common issues
- Frontend developers during implementation

---

## Architecture Overview

### Existing Endpoints (All Documented)

**User Management (AdminUserController)**
```
GET    /api/v1/admin/users                    - List staff
POST   /api/v1/admin/users                    - Create staff
PATCH  /api/v1/admin/users/{userId}/role     - Change role
```

**Business Applications (AdminBusinessController)**
```
GET    /api/v1/admin/business/applications               - List applications
PUT    /api/v1/admin/business/applications/{appId}      - Review application
```

**Video Moderation (ModeratorVideoController)**
```
GET    /api/v1/videos/check                  - List pending videos
GET    /api/v1/videos/check/{id}             - Get video by ID
PUT    /api/v1/videos/check/{id}?status=... - Approve/reject
```

**Analytics (AnalyticsVideosController)**
```
GET    /api/v1/analytics/summary             - Get 24h summary
```

---

## How to Use These Documents

### For Frontend Developers

1. **Start Here:** SUPER_ADMIN_API_QUICK_REFERENCE.md
   - Understand what endpoints exist
   - Get example cURL commands
   - Copy JavaScript fetch patterns

2. **Need Details?** SUPER_ADMIN_DASHBOARD_API.md
   - Check validation rules
   - Review error codes
   - See example payloads

3. **Building Dashboard Components:**
   - User Management: Sections 3 in both docs
   - Host Applications: Section 4 in both docs
   - Moderation Queue: Section 5 in both docs
   - Analytics Widget: Section 6 in both docs

### For Backend Developers

1. Review SUPER_ADMIN_DASHBOARD_API.md Section 2 (Authentication & Authorization)
2. Check specific endpoint documentation for scopes and validation
3. Review Audit & Security section for logging requirements
4. See Error Handling section for response formats

### For QA/Testing

1. Use SUPER_ADMIN_API_QUICK_REFERENCE.md for cURL commands
2. Reference validation rules in SUPER_ADMIN_DASHBOARD_API.md
3. Test error scenarios from error codes table
4. Verify business rules checklist in quick reference

### For DevOps/Security Review

1. Review Authentication & Authorization section in main docs
2. Check Security Best Practices section
3. Review Rate Limiting specifications
4. Check Audit Logging details

---

## Key Features Documented

### Authentication & Authorization
- JWT token structure (claims, scopes)
- Role-based access control (SUPER_ADMIN)
- Scope-based fine-grained permissions
- Token validation flow
- Token expiration and refresh

### User Management
- Create MODERATOR and ANALYST accounts
- Auto-generate or supply passwords
- Update user roles with immediate token revocation
- List all active staff members
- Enforce minimum moderator requirement

### Business Applications
- List with pagination and filtering
- Status tracking (PENDING → APPROVED/REJECTED)
- Detailed business information (category, price range, hours)
- Review notes for decisions
- Timestamp and reviewer tracking

### Video Moderation
- List all pending videos
- Presigned URLs for secure video preview (15 min expiry)
- Approve (move to public) or reject
- Metadata (title, description, tags)

### Platform Analytics
- 24-hour summary metrics
- Video approval/rejection counts
- Pending queue backlog
- Dashboard-ready format

### Security & Audit
- All admin actions logged (user creation, role changes, decisions)
- IP address and user agent captured
- Audit log queryable via SQL
- Rate limiting (100-200 req/min per user/IP)
- Account lockout tracking
- Password policy enforcement

---

## Example Dashboard Use Cases

### User Onboarding
```
1. Super admin goes to "Manage Staff" section
2. Clicks "Add New Moderator"
3. Fills: username, email, choose password approach
4. System generates temp password or accepts provided one
5. POST /api/v1/admin/users → Get userId and password
6. Share credentials with new staff member
```

### Host Application Review
```
1. Super admin sees "Pending Applications" widget
2. GET /api/v1/admin/business/applications?status=PENDING
3. Clicks application to view details
4. Reviews business info, contact details
5. Either:
   - PUT /api/v1/admin/business/applications/{id} with APPROVED
   - PUT /api/v1/admin/business/applications/{id} with REJECTED
```

### Moderation Queue Management
```
1. Super admin or moderator goes to "Review Videos"
2. GET /api/v1/videos/check → List all pending videos
3. Click video to watch preview (uses presigned URL)
4. PUT /api/v1/videos/check/{id}?status=APPROVED/REJECTED
5. Video moves to public or is removed from queue
```

### Dashboard Metrics
```
1. Dashboard loads overview widget
2. GET /api/v1/analytics/summary
3. Displays:
   - Total approved: 1250
   - Total rejected: 87
   - Pending (24h): 34
4. Uses to gauge team performance
```

---

## Common Tasks Reference

### I need to...

**Create a new moderator account**
→ POST endpoint in Section 3.2, Quick Reference page 3

**List all pending applications**
→ GET endpoint in Section 4.1, Quick Reference page 4

**Approve a host application**
→ PUT endpoint in Section 4.2, Quick Reference page 4

**Get videos awaiting approval**
→ GET endpoint in Section 5.1, Quick Reference page 5

**Approve a video for public**
→ PUT endpoint in Section 5.3, Quick Reference page 5

**View platform metrics**
→ GET endpoint in Section 6.1, Quick Reference page 5

**Change moderator to analyst**
→ PATCH endpoint in Section 3.3, Quick Reference page 2

**Handle 401 Unauthorized**
→ Error Handling section, Quick Reference page 8

**Fix validation errors**
→ See specific endpoint validation rules, Main Docs

**Debug rate limiting**
→ Debugging Tips section, Quick Reference page 9

---

## Response Examples Summary

All examples in documentation use realistic, production-like data:

**Users:**
- `moderator_alex`, `analyst_samantha`
- Real email formats: `alex.moderator@videosanity.local`
- Real timestamps with timezone info

**Applications:**
- Business names: "Greek Flavors Taverna", "Grand Plaza Hotel"
- Categories: RESTAURANT, HOTEL
- Price ranges: $, $$, $$$, $$$$
- Business hours for each day of week

**Videos:**
- Realistic titles: "Amazing Sunset at the Beach", "Recipe: Homemade Pasta"
- Tags: ["nature", "sunset", "beach", "relaxation"]
- Complete presigned S3 URLs with expiration

**Metrics:**
- Real-world numbers: 1250 approved, 87 rejected, 34 pending
- 24-hour lookback for pending queue

---

## Security Checklist

Before deploying super admin dashboard, verify:

✓ All endpoints validate JWT tokens
✓ SUPER_ADMIN role is enforced (not just scopes)
✓ Rate limiting is active (429 responses)
✓ Audit logging captures all admin actions
✓ Presigned URLs have 15-minute expiration
✓ Passwords meet policy (12 chars, mixed case, digit, special)
✓ At least one MODERATOR must remain active
✓ SUPER_ADMIN role cannot be modified
✓ Role changes revoke existing tokens
✓ Review notes are logged in audit trail
✓ IP address and user agent captured for all admin actions
✓ Account lockout enforced after failed login attempts

---

## API Endpoint Summary Table

| # | Endpoint | Method | Auth | Scope | Purpose |
|---|----------|--------|------|-------|---------|
| 1 | `/api/v1/admin/users` | GET | SUPER_ADMIN | admin:users:read | List staff |
| 2 | `/api/v1/admin/users` | POST | SUPER_ADMIN | admin:users:write | Create staff |
| 3 | `/api/v1/admin/users/{id}/role` | PATCH | SUPER_ADMIN | admin:users:write | Update role |
| 4 | `/api/v1/admin/business/applications` | GET | SUPER_ADMIN | admin:users:read | List apps |
| 5 | `/api/v1/admin/business/applications/{id}` | PUT | SUPER_ADMIN | admin:users:write | Review app |
| 6 | `/api/v1/videos/check` | GET | MODERATOR+ | moderation:read | List videos |
| 7 | `/api/v1/videos/check/{id}` | GET | MODERATOR+ | moderation:read | Get video |
| 8 | `/api/v1/videos/check/{id}` | PUT | MODERATOR+ | moderation:write | Approve/reject |
| 9 | `/api/v1/analytics/summary` | GET | ANALYST+ | analytics:read | Get metrics |

---

## Related Documentation

For deeper understanding of the platform, refer to:

- **ROLES.md** - Complete role system and permissions matrix
- **SECURITY_IMPLEMENTATION.md** - OAuth2 flow, token model, architecture
- **ANDROID_BE_CONNECTION.md** - Mobile client specifics (useful for understanding app context)
- **CLAUDE.md** - Full backend architecture and development setup
- **VIDEO_FLOW_REFACTOR.md** - Video lifecycle and aggregate design
- **GUEST_FLOW_IMPLEMENTATION.md** - Public video feed and guest access

---

## Document Versions

| Doc | Version | Size | Lines | Focus |
|-----|---------|------|-------|-------|
| SUPER_ADMIN_DASHBOARD_API.md | 1.0 | 44KB | 1454 | Complete specification |
| SUPER_ADMIN_API_QUICK_REFERENCE.md | 1.0 | 11KB | 412 | Quick lookup & examples |
| SUPER_ADMIN_DOCS_INDEX.md | 1.0 | - | - | This file (navigation) |

---

## Getting Started

### For a Frontend Developer

1. Read "Document Overview" above (5 min)
2. Skim SUPER_ADMIN_API_QUICK_REFERENCE.md (10 min)
3. Start building components using the endpoint tables
4. Refer to SUPER_ADMIN_DASHBOARD_API.md when you need details (5-10 min per feature)
5. Use cURL examples to test endpoints during development
6. Refer to error codes when debugging

### For Integration Testing

1. Review SUPER_ADMIN_API_QUICK_REFERENCE.md cURL section
2. Test each endpoint with provided examples
3. Verify error codes from main documentation
4. Validate business rules from quick reference checklist
5. Test pagination with multiple pages of data
6. Test rate limiting (429 responses)

### For API Monitoring

1. Monitor rate limit headers (X-RateLimit-*)
2. Log all 4xx/5xx responses
3. Alert on repeated 401 (possible token issues)
4. Alert on repeated 403 (possible permission issues)
5. Track response times (target <200ms for standard requests)
6. Review audit logs in database for security events

---

**Last Updated:** 2024-11-14
**Total Documentation:** 1866 lines across 2 files
**API Version:** 1.0
**Status:** Production Ready

For questions or clarifications, refer to the appropriate section in the full SUPER_ADMIN_DASHBOARD_API.md documentation.
