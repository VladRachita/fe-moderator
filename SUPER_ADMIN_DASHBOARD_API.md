# Super Admin Dashboard API Reference

## Overview

This document provides comprehensive API endpoint specifications for the videoSanity Super Admin Dashboard. The super admin role manages moderators, analysts, and business host applications, with full platform access for operational oversight.

**Super Admin Capabilities:**
- Create and manage platform staff accounts (MODERATOR, ANALYST)
- Update staff member roles
- Review and process host business applications
- Access full moderation and analytics capabilities
- Audit and monitor platform activity

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [User Management (Platform Staff)](#user-management-platform-staff)
3. [Business Host Applications](#business-host-applications)
4. [Video Content Moderation](#video-content-moderation)
5. [Platform Analytics & Metrics](#platform-analytics--metrics)
6. [Audit & Security](#audit--security)
7. [Error Handling](#error-handling)

---

## Authentication & Authorization

### JWT Token Structure

All authenticated endpoints require a valid JWT access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Required JWT Claims for Super Admin

The JWT token must contain:

| Claim | Required Value | Description |
|-------|---|---|
| `sub` | UUID | User ID (extracted from token subject) |
| `username` | string | Unique username |
| `roles` | array | Must include `SUPER_ADMIN` |
| `scope` | string | Space-separated scopes (e.g., `SCOPE_admin:users:read SCOPE_admin:users:write`) |

### Required Scopes

The following scopes are required for super admin endpoints:

| Scope | Endpoints | Purpose |
|-------|-----------|---------|
| `admin:users:read` | User listing, retrieval | Read access to platform staff accounts |
| `admin:users:write` | Create users, update roles | Write/modify platform staff accounts |
| `admin:applications:read` | List/get host applications | Read access to business applications |
| `admin:applications:write` | Review/approve/reject applications | Process host applications |
| `moderation:read` | View pending videos | Review content for approval |
| `moderation:write` | Approve/reject videos | Moderate video content |
| `analytics:read` | View platform metrics | Access analytics data |

### Token Validation

- **Token Type:** Bearer (JWT)
- **Issuer:** Must match `security.issuer` in application configuration
- **Audience:** Must match `security.audience` in application configuration
- **Expiration:** Access tokens expire after 10 minutes (configurable via `security.token.access-ttl`)
- **Refresh:** Use refresh token to obtain new access token; refresh tokens rotate on every use

### Example JWT Claims (Decoded)

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "username": "superadmin",
  "roles": ["SUPER_ADMIN"],
  "scope": "SCOPE_admin:users:read SCOPE_admin:users:write SCOPE_admin:applications:read SCOPE_admin:applications:write SCOPE_moderation:read SCOPE_moderation:write SCOPE_analytics:read",
  "iss": "http://videosanity.local",
  "aud": "videosanity-api",
  "iat": 1734192000,
  "exp": 1734192600
}
```

---

## User Management (Platform Staff)

Manage internal platform staff accounts (MODERATOR, ANALYST). Only SUPER_ADMIN can create and modify internal user roles.

### 1. List Internal Users

Retrieve all active platform staff members (moderators and analysts).

**Endpoint:**
```
GET /api/v1/admin/users
```

**Authentication:**
- Required Role: `SUPER_ADMIN`
- Required Scope: `admin:users:read`

**Request Parameters:**
None

**Response:**
```
HTTP 200 OK
Content-Type: application/json
```

**Response Body Schema:**

```json
[
  {
    "userId": "UUID",
    "username": "string (3-80 chars, alphanumeric + dots/dashes/underscores)",
    "email": "string or null (valid email format)",
    "role": "MODERATOR | ANALYST",
    "mustRotatePassword": "boolean",
    "lastPasswordRotation": "ISO 8601 timestamp",
    "createdAt": "ISO 8601 timestamp"
  }
]
```

**Response Sorting:**
- Primary: By role (MODERATOR first, then ANALYST)
- Secondary: By creation date (oldest first)

**Example cURL Request:**
```bash
curl -X GET http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
[
  {
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "username": "moderator_alex",
    "email": "alex.moderator@videosanity.local",
    "role": "MODERATOR",
    "mustRotatePassword": false,
    "lastPasswordRotation": "2024-11-10T14:32:00Z",
    "createdAt": "2024-10-15T09:00:00Z"
  },
  {
    "userId": "550e8400-e29b-41d4-a716-446655440002",
    "username": "moderator_jordan",
    "email": "jordan.mod@videosanity.local",
    "role": "MODERATOR",
    "mustRotatePassword": false,
    "lastPasswordRotation": "2024-11-08T10:15:00Z",
    "createdAt": "2024-10-20T11:30:00Z"
  },
  {
    "userId": "550e8400-e29b-41d4-a716-446655440003",
    "username": "analyst_samantha",
    "email": "samantha.analyst@videosanity.local",
    "role": "ANALYST",
    "mustRotatePassword": true,
    "lastPasswordRotation": "1970-01-01T00:00:00Z",
    "createdAt": "2024-11-01T13:45:00Z"
  }
]
```

**Possible Errors:**
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Insufficient permissions (missing SUPER_ADMIN role or scope)

---

### 2. Create Internal User (Platform Staff)

Create a new platform staff account (MODERATOR or ANALYST). The system generates a strong temporary password if not provided, requiring the user to change it on first login.

**Endpoint:**
```
POST /api/v1/admin/users
```

**Authentication:**
- Required Role: `SUPER_ADMIN`
- Required Scope: `admin:users:write`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
X-Forwarded-For: <optional, IP address for audit logging>
User-Agent: <optional, user agent for audit logging>
```

**Request Body Schema:**

```json
{
  "username": "string (required)",
  "email": "string (required)",
  "role": "MODERATOR | ANALYST (required)",
  "temporaryPassword": "string or null (optional)"
}
```

**Request Validation Rules:**

| Field | Rules | Example |
|-------|-------|---------|
| `username` | Alphanumeric, dots, dashes, underscores only; 3-80 characters; must be unique | `moderator_alex`, `analyst.sam`, `mod-01` |
| `email` | Valid email format; must be unique across the platform | `alex@videosanity.local` |
| `role` | Enum: `MODERATOR` or `ANALYST` | `MODERATOR` |
| `temporaryPassword` | If provided: must comply with password policy (see below); if omitted: auto-generated strong password | See password policy |

**Password Policy (if supplying temporaryPassword):**
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character from: `!@#$%^&*()-_=+[]{}|;:',.<>?/`

**Response:**
```
HTTP 201 Created
Content-Type: application/json
```

**Response Body Schema:**

```json
{
  "userId": "UUID",
  "username": "string",
  "email": "string",
  "role": "MODERATOR | ANALYST",
  "temporaryPassword": "string or null",
  "requiresPasswordChange": "boolean"
}
```

**Response Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `userId` | UUID | Unique identifier for the new user |
| `username` | string | Unique username provided in request |
| `email` | string | Email address provided in request |
| `role` | enum | Platform role (MODERATOR or ANALYST) |
| `temporaryPassword` | string or null | Auto-generated password if none supplied; null if admin supplied password |
| `requiresPasswordChange` | boolean | true if auto-generated; false if admin supplied password |

**Audit Logging:**
The system records the following audit event:
- **Event Type:** `ADMIN_USER_CREATED`
- **Actor:** Super admin creating the user (from JWT `sub` claim)
- **Details:** Created username, role, IP address, user agent
- **Storage:** `audit_log` table

**Example cURL Request (auto-generate password):**
```bash
curl -X POST http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 203.0.113.45" \
  -d '{
    "username": "moderator_blake",
    "email": "blake.mod@videosanity.local",
    "role": "MODERATOR"
  }'
```

**Example Response (auto-generated password):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440004",
  "username": "moderator_blake",
  "email": "blake.mod@videosanity.local",
  "role": "MODERATOR",
  "temporaryPassword": "aB3!xYz9@mKp$nQr",
  "requiresPasswordChange": true
}
```

**Example cURL Request (supply password):**
```bash
curl -X POST http://localhost:8080/api/v1/admin/users \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "analyst_chris",
    "email": "chris.analyst@videosanity.local",
    "role": "ANALYST",
    "temporaryPassword": "SecureP@ssw0rd123!"
  }'
```

**Example Response (admin-supplied password):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440005",
  "username": "analyst_chris",
  "email": "chris.analyst@videosanity.local",
  "role": "ANALYST",
  "temporaryPassword": null,
  "requiresPasswordChange": false
}
```

**Possible Errors:**

| Status | Error | Description |
|--------|-------|-------------|
| `400 Bad Request` | `Username already in use` | Supplied username exists in database |
| `400 Bad Request` | `Email already in use` | Supplied email exists in database |
| `400 Bad Request` | `Username is required` | Username field is blank/missing |
| `400 Bad Request` | `Email is required` | Email field is blank/missing |
| `400 Bad Request` | `Username may contain only letters, digits, dots, dashes or underscores (3-80 characters)` | Invalid username format |
| `400 Bad Request` | `Email must be a valid address` | Invalid email format |
| `400 Bad Request` | `Role ... cannot be provisioned by super admin` | Attempted to create user with SUPER_ADMIN role (not allowed) |
| `400 Bad Request` | Password validation error | If `temporaryPassword` doesn't meet policy requirements |
| `401 Unauthorized` | `Token subject missing` | JWT `sub` claim is missing |
| `401 Unauthorized` | `Invalid user identifier` | JWT `sub` claim is not a valid UUID |
| `403 Forbidden` | Insufficient permissions | Missing SUPER_ADMIN role or required scope |

---

### 3. Update Internal User Role

Change a platform staff member's role (MODERATOR ↔ ANALYST). This endpoint revokes all active access tokens for the user to enforce immediate role-based permission changes.

**Endpoint:**
```
PATCH /api/v1/admin/users/{userId}/role
```

**Authentication:**
- Required Role: `SUPER_ADMIN`
- Required Scope: `admin:users:write`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
X-Forwarded-For: <optional, IP address for audit logging>
User-Agent: <optional, user agent for audit logging>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | UUID | ID of the user whose role will be updated |

**Request Body Schema:**

```json
{
  "role": "MODERATOR | ANALYST (required)"
}
```

**Request Validation Rules:**
- `role` must be either `MODERATOR` or `ANALYST`
- Cannot change SUPER_ADMIN role (only super admins can have this role)
- At least one MODERATOR must remain active at all times (system enforces minimum)

**Response:**
```
HTTP 200 OK
Content-Type: application/json
```

**Response Body Schema:**

Same as `InternalUserSummaryDto` (see List Internal Users response)

```json
{
  "userId": "UUID",
  "username": "string",
  "email": "string or null",
  "role": "MODERATOR | ANALYST",
  "mustRotatePassword": "boolean",
  "lastPasswordRotation": "ISO 8601 timestamp",
  "createdAt": "ISO 8601 timestamp"
}
```

**Side Effects:**
1. User's role is updated in database
2. All active access tokens issued to this user are revoked (revoked at current timestamp)
3. Next login will issue tokens with new role-based scopes
4. Audit log entry is created recording the role change

**Audit Logging:**
- **Event Type:** `ADMIN_ROLE_CHANGE`
- **Actor:** Super admin making the change (from JWT `sub` claim)
- **Details:** Target user ID, previous role, new role, IP address, user agent
- **Storage:** `audit_log` table

**Example cURL Request:**
```bash
curl -X PATCH http://localhost:8080/api/v1/admin/users/550e8400-e29b-41d4-a716-446655440003/role \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 203.0.113.45" \
  -d '{
    "role": "MODERATOR"
  }'
```

**Example Response:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440003",
  "username": "analyst_samantha",
  "email": "samantha.analyst@videosanity.local",
  "role": "MODERATOR",
  "mustRotatePassword": true,
  "lastPasswordRotation": "1970-01-01T00:00:00Z",
  "createdAt": "2024-11-01T13:45:00Z"
}
```

**Possible Errors:**

| Status | Error | Description |
|--------|-------|-------------|
| `400 Bad Request` | `Operator not found` | Super admin making request not found in database |
| `400 Bad Request` | `Only super admins can modify internal roles` | Operator does not have SUPER_ADMIN role |
| `400 Bad Request` | `Target user not found` | User ID in path does not exist |
| `400 Bad Request` | `Target user does not have a platform role` | User has no platform role (e.g., regular customer) |
| `400 Bad Request` | `Cannot modify super admin roles` | Attempted to change SUPER_ADMIN role (not allowed) |
| `400 Bad Request` | `Target user role is not managed by this endpoint` | Target user's current role cannot be modified |
| `400 Bad Request` | `At least one moderator must remain active` | Attempting to change last active moderator away from MODERATOR role |
| `400 Bad Request` | Role validation error | Invalid role enum value |
| `401 Unauthorized` | `Token subject missing` | JWT `sub` claim is missing |
| `401 Unauthorized` | `Invalid user identifier` | JWT `sub` claim is not a valid UUID |
| `403 Forbidden` | Insufficient permissions | Missing SUPER_ADMIN role or required scope |
| `404 Not Found` | User not found | Path parameter is invalid UUID format |

---

## Business Host Applications

Manage Host (business user) applications. Host applications require super admin review and approval before the applicant can use Host features.

**Application Status Flow:**
```
PENDING → APPROVED (accepted)
       → REJECTED (denied)
```

### 1. List Host Applications

Retrieve a paginated list of host business applications filtered by status.

**Endpoint:**
```
GET /api/v1/admin/business/applications
```

**Authentication:**
- Required Role: `SUPER_ADMIN`
- Required Scope: `admin:users:read`

**Request Parameters:**

| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|-----------|-------------|
| `status` | enum | `PENDING` | PENDING, APPROVED, REJECTED | Filter by application status |
| `page` | integer | `0` | min: 0 | Zero-indexed page number |
| `size` | integer | `20` | min: 1, max: 50 | Number of results per page |

**Response:**
```
HTTP 200 OK
Content-Type: application/json
```

**Response Body Schema:**

```json
{
  "applications": [
    {
      "applicationId": "UUID",
      "userId": "UUID",
      "username": "string",
      "email": "string",
      "status": "PENDING | APPROVED | REJECTED",
      "businessName": "string",
      "category": "RESTAURANT | HOTEL",
      "businessAddress": "string",
      "phoneNumber": "string",
      "priceRange": "$ | $$ | $$$ | $$$$",
      "businessHours": {
        "monday": "string",
        "tuesday": "string",
        "wednesday": "string",
        "thursday": "string",
        "friday": "string",
        "saturday": "string",
        "sunday": "string"
      },
      "servicesOffered": "string",
      "submittedAt": "ISO 8601 timestamp",
      "reviewedBy": "UUID or null",
      "reviewedAt": "ISO 8601 timestamp or null",
      "reviewNotes": "string or null"
    }
  ],
  "page": "integer",
  "size": "integer",
  "totalElements": "integer",
  "totalPages": "integer"
}
```

**Response Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `applicationId` | UUID | Unique application identifier |
| `userId` | UUID | ID of the applicant (customer requesting to become Host) |
| `username` | string | Applicant's username |
| `email` | string | Applicant's email address |
| `status` | enum | Current application status |
| `businessName` | string | Legal business name |
| `category` | enum | Business category (RESTAURANT, HOTEL) |
| `businessAddress` | string | Full business address |
| `phoneNumber` | string | Business contact phone number |
| `priceRange` | enum | Price tier ($, $$, $$$, $$$$) |
| `businessHours` | object | Operating hours per day (e.g., "09:00-22:00" or "Closed") |
| `servicesOffered` | string | Description of services offered |
| `submittedAt` | timestamp | When application was submitted |
| `reviewedBy` | UUID or null | ID of super admin who reviewed (null if pending) |
| `reviewedAt` | timestamp or null | When application was reviewed (null if pending) |
| `reviewNotes` | string or null | Admin notes from review (approval reason or rejection reason) |

**Pagination:**
- Responses are paginated to prevent large data transfers
- Use `page` and `size` parameters to navigate results
- `totalElements` indicates total number of applications matching the filter
- `totalPages` = ceiling(`totalElements` / `size`)

**Example cURL Request (get pending applications):**
```bash
curl -X GET "http://localhost:8080/api/v1/admin/business/applications?status=PENDING&page=0&size=20" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "applications": [
    {
      "applicationId": "660e8400-e29b-41d4-a716-446655440010",
      "userId": "550e8400-e29b-41d4-a716-446655440100",
      "username": "restaurateur_maria",
      "email": "maria@greekflavors.local",
      "status": "PENDING",
      "businessName": "Greek Flavors Taverna",
      "category": "RESTAURANT",
      "businessAddress": "123 Mediterranean Ave, Midtown, NY 10001",
      "phoneNumber": "+1-555-0123",
      "priceRange": "$$",
      "businessHours": {
        "monday": "11:00-23:00",
        "tuesday": "11:00-23:00",
        "wednesday": "11:00-23:00",
        "thursday": "11:00-23:00",
        "friday": "11:00-00:00",
        "saturday": "11:00-00:00",
        "sunday": "11:00-22:00"
      },
      "servicesOffered": "Dine-in, takeout, delivery, catering for events",
      "submittedAt": "2024-11-12T10:30:00Z",
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null
    },
    {
      "applicationId": "660e8400-e29b-41d4-a716-446655440011",
      "userId": "550e8400-e29b-41d4-a716-446655440101",
      "username": "hotelmanager_raj",
      "email": "raj@grandplaza.local",
      "status": "PENDING",
      "businessName": "Grand Plaza Hotel",
      "category": "HOTEL",
      "businessAddress": "456 Luxury Boulevard, Downtown, NY 10002",
      "phoneNumber": "+1-555-0456",
      "priceRange": "$$$",
      "businessHours": {
        "monday": "00:00-23:59",
        "tuesday": "00:00-23:59",
        "wednesday": "00:00-23:59",
        "thursday": "00:00-23:59",
        "friday": "00:00-23:59",
        "saturday": "00:00-23:59",
        "sunday": "00:00-23:59"
      },
      "servicesOffered": "Lodging, restaurant, spa, fitness center, event venues",
      "submittedAt": "2024-11-13T14:15:00Z",
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 2,
  "totalPages": 1
}
```

**Example cURL Request (get approved applications, page 2):**
```bash
curl -X GET "http://localhost:8080/api/v1/admin/business/applications?status=APPROVED&page=1&size=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Possible Errors:**

| Status | Error | Description |
|--------|-------|-------------|
| `400 Bad Request` | `page must be >= 0` | Page parameter is negative |
| `400 Bad Request` | `size must be between 1 and 50` | Size parameter out of range |
| `400 Bad Request` | Invalid enum value | Status parameter is not PENDING, APPROVED, or REJECTED |
| `401 Unauthorized` | `Token subject missing` | JWT `sub` claim is missing |
| `403 Forbidden` | Insufficient permissions | Missing SUPER_ADMIN role or required scope |

---

### 2. Review Host Application

Approve or reject a pending host application with optional review notes.

**Endpoint:**
```
PUT /api/v1/admin/business/applications/{applicationId}
```

**Authentication:**
- Required Role: `SUPER_ADMIN`
- Required Scope: `admin:users:write`

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `applicationId` | UUID | ID of application to review |

**Request Body Schema:**

```json
{
  "status": "APPROVED | REJECTED (required)",
  "reviewNotes": "string or null (optional)"
}
```

**Request Validation Rules:**

| Field | Rules | Example |
|-------|-------|---------|
| `status` | Enum: `APPROVED` or `REJECTED`; case-insensitive | `"APPROVED"` or `"REJECTED"` |
| `reviewNotes` | Optional; max 500 characters | `"Outstanding application, all documentation verified"` |

**Response:**
```
HTTP 200 OK
Content-Type: application/json
```

**Response Body Schema:**

Same as individual application object (AdminHostApplicationDto)

```json
{
  "applicationId": "UUID",
  "userId": "UUID",
  "username": "string",
  "email": "string",
  "status": "PENDING | APPROVED | REJECTED",
  "businessName": "string",
  "category": "RESTAURANT | HOTEL",
  "businessAddress": "string",
  "phoneNumber": "string",
  "priceRange": "$ | $$ | $$$ | $$$$",
  "businessHours": {
    "monday": "string",
    "tuesday": "string",
    "wednesday": "string",
    "thursday": "string",
    "friday": "string",
    "saturday": "string",
    "sunday": "string"
  },
  "servicesOffered": "string",
  "submittedAt": "ISO 8601 timestamp",
  "reviewedBy": "UUID",
  "reviewedAt": "ISO 8601 timestamp",
  "reviewNotes": "string or null"
}
```

**Response Field Changes After Approval/Rejection:**
- `status` - Updated to APPROVED or REJECTED
- `reviewedBy` - Set to super admin's user ID (from JWT `sub`)
- `reviewedAt` - Set to current timestamp
- `reviewNotes` - Updated with admin's notes (if provided)

**Business Logic:**
- Only PENDING applications can be reviewed
- Reviewing an application transitions it to either APPROVED or REJECTED state (irreversible)
- If APPROVED: The applicant's user account is granted Host privileges (user_type = HOST)
- If REJECTED: The applicant remains a Customer and can reapply after 30 days (optional business rule)

**Example cURL Request (approve application):**
```bash
curl -X PUT http://localhost:8080/api/v1/admin/business/applications/660e8400-e29b-41d4-a716-446655440010 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "reviewNotes": "All documentation verified. Business address confirmed valid. Recommended for immediate approval."
  }'
```

**Example Response (approved):**
```json
{
  "applicationId": "660e8400-e29b-41d4-a716-446655440010",
  "userId": "550e8400-e29b-41d4-a716-446655440100",
  "username": "restaurateur_maria",
  "email": "maria@greekflavors.local",
  "status": "APPROVED",
  "businessName": "Greek Flavors Taverna",
  "category": "RESTAURANT",
  "businessAddress": "123 Mediterranean Ave, Midtown, NY 10001",
  "phoneNumber": "+1-555-0123",
  "priceRange": "$$",
  "businessHours": {
    "monday": "11:00-23:00",
    "tuesday": "11:00-23:00",
    "wednesday": "11:00-23:00",
    "thursday": "11:00-23:00",
    "friday": "11:00-00:00",
    "saturday": "11:00-00:00",
    "sunday": "11:00-22:00"
  },
  "servicesOffered": "Dine-in, takeout, delivery, catering for events",
  "submittedAt": "2024-11-12T10:30:00Z",
  "reviewedBy": "550e8400-e29b-41d4-a716-446655440000",
  "reviewedAt": "2024-11-14T09:45:00Z",
  "reviewNotes": "All documentation verified. Business address confirmed valid. Recommended for immediate approval."
}
```

**Example cURL Request (reject application):**
```bash
curl -X PUT http://localhost:8080/api/v1/admin/business/applications/660e8400-e29b-41d4-a716-446655440011 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "REJECTED",
    "reviewNotes": "Business license expired. Please reapply with current documentation."
  }'
```

**Example Response (rejected):**
```json
{
  "applicationId": "660e8400-e29b-41d4-a716-446655440011",
  "userId": "550e8400-e29b-41d4-a716-446655440101",
  "username": "hotelmanager_raj",
  "email": "raj@grandplaza.local",
  "status": "REJECTED",
  "businessName": "Grand Plaza Hotel",
  "category": "HOTEL",
  "businessAddress": "456 Luxury Boulevard, Downtown, NY 10002",
  "phoneNumber": "+1-555-0456",
  "priceRange": "$$$",
  "businessHours": {
    "monday": "00:00-23:59",
    "tuesday": "00:00-23:59",
    "wednesday": "00:00-23:59",
    "thursday": "00:00-23:59",
    "friday": "00:00-23:59",
    "saturday": "00:00-23:59",
    "sunday": "00:00-23:59"
  },
  "servicesOffered": "Lodging, restaurant, spa, fitness center, event venues",
  "submittedAt": "2024-11-13T14:15:00Z",
  "reviewedBy": "550e8400-e29b-41d4-a716-446655440000",
  "reviewedAt": "2024-11-14T10:20:00Z",
  "reviewNotes": "Business license expired. Please reapply with current documentation."
}
```

**Possible Errors:**

| Status | Error | Description |
|--------|-------|-------------|
| `400 Bad Request` | `Status must be APPROVED or REJECTED` | Invalid status in request body |
| `400 Bad Request` | `Review notes cannot exceed 500 characters` | reviewNotes field exceeds max length |
| `400 Bad Request` | `Status is required` | Missing status field in request |
| `404 Not Found` | Application not found | Application ID does not exist |
| `409 Conflict` | Cannot review already reviewed application | Application status is not PENDING |
| `401 Unauthorized` | `Token subject missing` | JWT `sub` claim is missing |
| `403 Forbidden` | Insufficient permissions | Missing SUPER_ADMIN role or required scope |

---

## Video Content Moderation

Moderators (and super admins with moderator permissions) review and approve/reject pending videos.

### 1. Get All Pending Videos

Retrieve all videos awaiting moderation approval.

**Endpoint:**
```
GET /api/v1/videos/check
```

**Authentication:**
- Required Role: `MODERATOR` or `SUPER_ADMIN`
- Required Scope: `moderation:read`

**Request Parameters:**
None

**Response:**
```
HTTP 200 OK
Content-Type: application/json
```

**Response Body Schema:**

```json
[
  {
    "id": "UUID",
    "title": "string",
    "description": "string or null",
    "tags": ["string"],
    "presignedUrl": "string (S3 presigned URL, valid for 15 minutes)"
  }
]
```

**Response Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Video unique identifier |
| `title` | string | Video title |
| `description` | string or null | Video description (markdown or plain text) |
| `tags` | array | Searchable tags/categories for the video |
| `presignedUrl` | string | Temporary S3 presigned URL for video streaming (expires in 15 minutes) |

**Presigned URL Details:**
- URLs expire after 15 minutes to prevent unauthorized access
- If URL has expired (403 response when accessed), refetch this endpoint to get a fresh URL
- URLs are read-only for viewing only; cannot be used to upload or modify

**Example cURL Request:**
```bash
curl -X GET http://localhost:8080/api/v1/videos/check \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440020",
    "title": "Amazing Sunset at the Beach",
    "description": "A beautiful time-lapse of the sunset over the ocean with ambient music.",
    "tags": ["nature", "sunset", "beach", "relaxation"],
    "presignedUrl": "http://localhost:9000/videos/uploads/2024/11/770e8400-e29b-41d4-a716-446655440020.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=minioadmin%2F20241114T093000Z%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20241114T093000Z&X-Amz-Expires=900&X-Amz-SignedHeaders=host&X-Amz-Signature=abc123xyz..."
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440021",
    "title": "Recipe: Homemade Pasta",
    "description": "Learn how to make authentic Italian pasta from scratch in under 30 minutes.",
    "tags": ["cooking", "recipe", "pasta", "italian"],
    "presignedUrl": "http://localhost:9000/videos/uploads/2024/11/770e8400-e29b-41d4-a716-446655440021.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&..."
  }
]
```

**Possible Errors:**

| Status | Error | Description |
|--------|-------|-------------|
| `400 Bad Request` | Generic error during retrieval | See error message details |
| `401 Unauthorized` | `Token subject missing` | JWT `sub` claim is missing |
| `403 Forbidden` | Insufficient permissions | Missing MODERATOR role or `moderation:read` scope |

---

### 2. Get Pending Video by ID

Retrieve a specific pending video for detailed review.

**Endpoint:**
```
GET /api/v1/videos/check/{id}
```

**Authentication:**
- Required Role: `MODERATOR` or `SUPER_ADMIN`
- Required Scope: `moderation:read`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Video unique identifier |

**Response:**
```
HTTP 200 OK
Content-Type: application/json
```

**Response Body Schema:**

Same as Get All Pending Videos response (single object, not array)

```json
{
  "id": "UUID",
  "title": "string",
  "description": "string or null",
  "tags": ["string"],
  "presignedUrl": "string"
}
```

**Example cURL Request:**
```bash
curl -X GET http://localhost:8080/api/v1/videos/check/770e8400-e29b-41d4-a716-446655440020 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440020",
  "title": "Amazing Sunset at the Beach",
  "description": "A beautiful time-lapse of the sunset over the ocean with ambient music.",
  "tags": ["nature", "sunset", "beach", "relaxation"],
  "presignedUrl": "http://localhost:9000/videos/uploads/2024/11/770e8400-e29b-41d4-a716-446655440020.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&..."
}
```

**Possible Errors:**

| Status | Error | Description |
|--------|-------|-------------|
| `400 Bad Request` | Generic error during retrieval | See error message details |
| `404 Not Found` | Video not found or already moderated | Video ID does not exist in PENDING status |
| `401 Unauthorized` | `Token subject missing` | JWT `sub` claim is missing |
| `403 Forbidden` | Insufficient permissions | Missing MODERATOR role or `moderation:read` scope |

---

### 3. Update Video Moderation Status

Approve or reject a pending video. Approved videos are moved from staging storage to public storage and become visible in the public feed.

**Endpoint:**
```
PUT /api/v1/videos/check/{id}
```

**Authentication:**
- Required Role: `MODERATOR` or `SUPER_ADMIN`
- Required Scope: `moderation:write`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Video unique identifier |

**Request Parameters:**

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|-----------|-------------|
| `status` | string | Yes | APPROVED or REJECTED (case-insensitive) | Moderation decision |

**Response:**
```
HTTP 200 OK
Content-Type: text/plain
```

**Response Body:**
```
"Video approved successfully." or "Video rejected successfully."
```

**Business Logic:**
- **APPROVED**:
  - Video status updated to APPROVED
  - File moved from MinIO `uploads/{year}/{month}/{id}.mp4` to `final/{year}/{month}/{id}.mp4`
  - Video becomes visible in public feed
  - Creator's metrics updated

- **REJECTED**:
  - Video status updated to REJECTED
  - File deleted or moved to quarantine storage
  - Video removed from public feed
  - Creator notified (optional: email notification)

**Example cURL Request (approve):**
```bash
curl -X PUT "http://localhost:8080/api/v1/videos/check/770e8400-e29b-41d4-a716-446655440020?status=APPROVED" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Example Response (approve):**
```
Video approved successfully.
```

**Example cURL Request (reject):**
```bash
curl -X PUT "http://localhost:8080/api/v1/videos/check/770e8400-e29b-41d4-a716-446655440021?status=REJECTED" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Example Response (reject):**
```
Video rejected successfully.
```

**Possible Errors:**

| Status | Error | Description |
|--------|-------|-------------|
| `400 Bad Request` | Generic error (see logs) | Status parameter invalid or processing failed |
| `404 Not Found` | Video not found | Video ID does not exist |
| `401 Unauthorized` | `Token subject missing` | JWT `sub` claim is missing |
| `403 Forbidden` | Insufficient permissions | Missing MODERATOR role or `moderation:write` scope |

---

## Platform Analytics & Metrics

Analysts and super admins can view platform-wide analytics and video moderation statistics.

### 1. Get Video Analytics Summary (24 Hours)

Retrieve summary analytics for the past 24 hours: approved/rejected video counts and pending queue status.

**Endpoint:**
```
GET /api/v1/analytics/summary
```

**Authentication:**
- Required Role: `ANALYST` or `SUPER_ADMIN`
- Required Scope: `analytics:read`

**Request Parameters:**
None

**Response:**
```
HTTP 200 OK
Content-Type: application/json
```

**Response Body Schema:**

```json
{
  "approved_count": "integer",
  "rejected_count": "integer",
  "pending_last_24h_count": "integer"
}
```

**Response Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `approved_count` | integer | Total videos approved (all time) |
| `rejected_count` | integer | Total videos rejected (all time) |
| `pending_last_24h_count` | integer | Videos still in PENDING status submitted in last 24 hours |

**Use Cases:**
- Dashboard metrics widget showing moderation queue health
- Performance monitoring for moderator team effectiveness
- Trend analysis (compare 24h pending count across days)

**Example cURL Request:**
```bash
curl -X GET http://localhost:8080/api/v1/analytics/summary \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "approved_count": 1250,
  "rejected_count": 87,
  "pending_last_24h_count": 34
}
```

**Interpretation:**
- Total videos ever approved: 1250
- Total videos ever rejected: 87
- Videos submitted in last 24h still awaiting review: 34

**Performance Metrics:**
- Approval rate: 1250 / (1250 + 87) = 93.4%
- Queue backlog: 34 pending
- Estimated review time: depends on team capacity

**Possible Errors:**

| Status | Error | Description |
|--------|-------|-------------|
| `400 Bad Request` | Generic error | Database or query error (see logs) |
| `401 Unauthorized` | `Token subject missing` | JWT `sub` claim is missing |
| `403 Forbidden` | Insufficient permissions | Missing ANALYST role or `analytics:read` scope |

---

## Audit & Security

### JWT Token Validation Flow

When a request arrives at a protected endpoint:

1. **Token Extraction**: Bearer token extracted from `Authorization` header
2. **Signature Verification**: JWT signature validated using RSA public key (from JWK Set)
3. **Claims Validation**:
   - `exp` (expiration) claim checked against current time
   - `iss` (issuer) claim verified against configured issuer
   - `aud` (audience) claim verified against configured audience
4. **Replay Protection**: Token checked against replay attack detection (if configured)
5. **Role/Scope Extraction**:
   - `roles` claim extracted and compared against `@PreAuthorize` requirements
   - `scope` claim parsed and checked against required authority
6. **User Context**: Token subject (`sub`) extracted as user ID for audit logging

### Rate Limiting

All endpoints are protected by rate limiting to prevent abuse:

- **Per-IP Rate Limit**: 100 requests per minute (default, configurable)
- **Per-User Rate Limit**: 200 requests per minute after authentication (default, configurable)
- **Endpoint-Specific Limits**: Some endpoints may have stricter limits

**Rate Limit Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1634192000
```

**Exceeded Limit Response:**
```
HTTP 429 Too Many Requests
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1634192060

{
  "error": "Rate limit exceeded. Try again in 60 seconds."
}
```

### Audit Logging

All administrative actions are logged for compliance and security monitoring:

**Logged Events:**
- User creation (admin:users:write)
- Role changes (admin:users:write)
- Host application reviews (admin:applications:write)
- Video moderation decisions (moderation:write)
- Failed authentication attempts
- Account lockouts

**Audit Log Entry Structure:**
```json
{
  "eventType": "string (e.g., ADMIN_USER_CREATED, ADMIN_ROLE_CHANGE)",
  "userId": "UUID (actor)",
  "details": {
    "targetId": "UUID (subject of action)",
    "action": "string",
    "previousValue": "any",
    "newValue": "any"
  },
  "ipAddress": "string",
  "userAgent": "string",
  "createdAt": "ISO 8601 timestamp"
}
```

**Accessing Audit Logs:**
Audit logs are stored in the `audit_log` PostgreSQL table. Query examples:

```sql
-- Find all actions by a specific admin
SELECT * FROM audit_log
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC;

-- Find all user creation events in last 7 days
SELECT * FROM audit_log
WHERE event_type = 'ADMIN_USER_CREATED'
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;

-- Find all role change attempts
SELECT * FROM audit_log
WHERE event_type = 'ADMIN_ROLE_CHANGE'
ORDER BY created_at DESC;
```

---

## Error Handling

All endpoints return standard HTTP status codes and error responses.

### Error Response Format

**HTTP Status Code**: Indicates the type of error

**Response Body** (application/json):
```json
{
  "error": "string (human-readable error message)",
  "timestamp": "ISO 8601 timestamp",
  "path": "string (request path)",
  "status": "integer (HTTP status code)"
}
```

### Common HTTP Status Codes

| Code | Meaning | Typical Cause | Recovery |
|------|---------|---------------|----------|
| `200 OK` | Request succeeded | N/A | No action needed |
| `201 Created` | Resource created | POST request successful | No action needed |
| `400 Bad Request` | Invalid request | Validation error, malformed JSON, missing field | Check request body and parameters |
| `401 Unauthorized` | No/invalid authentication | Missing JWT, expired token, invalid signature | Refresh token or re-authenticate |
| `403 Forbidden` | Insufficient permissions | Missing required role or scope | Contact admin to grant permissions |
| `404 Not Found` | Resource not found | ID does not exist in database | Verify ID is correct |
| `409 Conflict` | State conflict | Attempting invalid state transition | Check resource status and rules |
| `429 Too Many Requests` | Rate limit exceeded | Too many requests in short time | Wait before retrying (see header) |
| `500 Internal Server Error` | Server error | Unhandled exception | Contact support, check server logs |

### Validation Error Details

When a `400 Bad Request` is returned for validation failures, the response includes specific field errors:

```json
{
  "error": "Validation failed",
  "details": {
    "username": "Username may contain only letters, digits, dots, dashes or underscores (3-80 characters)",
    "email": "Email must be a valid address"
  }
}
```

### Retry Strategy

Recommended retry logic for client applications:

```
1. If 401 Unauthorized → Refresh access token, retry request
2. If 403 Forbidden → Contact admin, don't retry
3. If 429 Too Many Requests → Wait (see X-RateLimit-Reset header), retry
4. If 500+ Server Error → Wait with exponential backoff, retry up to 3 times
5. If 4xx Client Error → Fix request, don't retry
```

---

## Implementation Guide for Frontend Developers

### Setting Up Authentication

1. **Obtain Access Token**
   ```javascript
   // After successful login (PKCE flow)
   const token = localStorage.getItem('accessToken');
   const headers = {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   };
   ```

2. **Handle Token Expiration**
   ```javascript
   // If 401 response received
   const newToken = await refreshToken(); // Use refresh token endpoint
   localStorage.setItem('accessToken', newToken);
   // Retry original request with new token
   ```

3. **Include Required Headers**
   - All POST/PATCH endpoints should include Content-Type
   - Include X-Forwarded-For and User-Agent for audit logging (optional but recommended)

### Pagination Pattern

```javascript
// Fetch applications page by page
async function fetchAllApplications(status) {
  let allApps = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `/api/v1/admin/business/applications?status=${status}&page=${page}&size=50`,
      { headers }
    );
    const data = await response.json();
    allApps.push(...data.applications);
    hasMore = page < data.totalPages - 1;
    page++;
  }

  return allApps;
}
```

### Error Handling Pattern

```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });

    if (response.status === 401) {
      // Token expired, refresh and retry
      await refreshAccessToken();
      return apiCall(endpoint, options); // Retry once
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API error');
    }

    return response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

### Rate Limit Handling

```javascript
async function handleRateLimitedCall(endpoint, options) {
  const response = await fetch(endpoint, options);

  if (response.status === 429) {
    const resetTime = parseInt(response.headers.get('X-RateLimit-Reset')) * 1000;
    const waitTime = resetTime - Date.now();
    console.warn(`Rate limited. Waiting ${waitTime}ms...`);

    await new Promise(resolve => setTimeout(resolve, waitTime));
    return handleRateLimitedCall(endpoint, options); // Retry
  }

  return response;
}
```

---

## Summary Table: All Admin Endpoints

| HTTP Method | Endpoint | Role | Scope | Purpose |
|------------|----------|------|-------|---------|
| GET | `/api/v1/admin/users` | SUPER_ADMIN | admin:users:read | List all platform staff |
| POST | `/api/v1/admin/users` | SUPER_ADMIN | admin:users:write | Create new staff account |
| PATCH | `/api/v1/admin/users/{userId}/role` | SUPER_ADMIN | admin:users:write | Change staff member's role |
| GET | `/api/v1/admin/business/applications` | SUPER_ADMIN | admin:users:read | List host applications |
| PUT | `/api/v1/admin/business/applications/{id}` | SUPER_ADMIN | admin:users:write | Review/approve/reject application |
| GET | `/api/v1/videos/check` | MODERATOR+ | moderation:read | Get all pending videos |
| GET | `/api/v1/videos/check/{id}` | MODERATOR+ | moderation:read | Get specific pending video |
| PUT | `/api/v1/videos/check/{id}` | MODERATOR+ | moderation:write | Approve/reject pending video |
| GET | `/api/v1/analytics/summary` | ANALYST+ | analytics:read | Get 24h video metrics |

---

## Additional Resources

- **ROLES.md** — Detailed role definitions and permissions
- **SECURITY_IMPLEMENTATION.md** — OAuth2 flow, token model, security architecture
- **ANDROID_BE_CONNECTION.md** — Mobile client integration specifics
- **CLAUDE.md** — Development setup and architecture overview

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-11-14 | Initial documentation: user management, host applications, moderation, analytics |

---

**Last Updated:** 2024-11-14
**API Version:** 1.0
**Status:** Production Ready
