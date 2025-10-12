• Backend Status

  - Added SUPER_ADMIN role and privileged metadata tracking so staff provisioning is auditable (src/main/kotlin/merg/video/videoSanity/models/enums/PlatformRoles.kt:3, src/
    main/kotlin/merg/video/videoSanity/models/security/UserAccount.kt:27, src/main/resources/schema.sql:34). Dev profile now seeds a super admin plus expanded OAuth client
    scopes (src/main/kotlin/merg/video/videoSanity/security/config/DevSecurityDataInitializer.kt:30).
  - Scope engine and user details were extended to grant moderator, analyst, and admin permissions only to super admins while exposing permissions.canManageUsers in /
    api/v1/me responses (src/main/kotlin/merg/video/videoSanity/security/service/ScopePolicyService.kt:16, src/main/kotlin/merg/video/videoSanity/security/service/dto/
    UserPermissionsDto.kt:3, src/main/kotlin/merg/video/videoSanity/security/service/UserAccountDetailsService.kt:22).
  - Delivered the closed provisioning flow at /api/v1/admin/users guarded by ROLE_SUPER_ADMIN and SCOPE_admin:users:write; accounts are created through AdminUserService
    with strong-password defaults, Argon2 hashing, and audit trails (src/main/kotlin/merg/video/videoSanity/controller/AdminUserController.kt:30, src/main/kotlin/merg/
    video/videoSanity/security/service/AdminUserService.kt:29, src/main/kotlin/merg/video/videoSanity/security/service/SessionAuditService.kt:39).
  - Unit and WebFlux tests cover scope logic, JWT claims, service behavior, controller contract, and super-admin authorities using the new in-memory repositories (src/test/
    kotlin/merg/video/videoSanity/security/ScopePolicyServiceTest.kt:15, src/test/kotlin/merg/video/videoSanity/security/JwtServiceTest.kt:32, src/test/kotlin/merg/video/
    videoSanity/security/AdminUserServiceTest.kt:29, src/test/kotlin/merg/video/videoSanity/controller/AdminUserControllerTest.kt:36).

  Backend Follow-Ups

  - Sweep the codebase for any direct UserAccountRepository.save usages that should funnel through AdminUserService to maintain the closed system.
  - Implement the planned admin read/reset flows and integration test once an environment with Java is available to execute ./gradlew test.
  - Layer rate limiting/monitoring on admin endpoints before production rollout.

  Frontend Responsibilities

  - Request the expanded scope set (moderation:read, moderation:write, analytics:read, admin:users:read, admin:users:write) during OAuth and persist the new
    permissions.canManageUsers flag from /api/v1/me to gate admin UI.
  - Build the super-admin dashboard section that posts to POST /api/v1/admin/users with payload { username, email, role }, optionally accepting a temporary password that
    satisfies the 12-char mixed-case/digit/symbol policy.
  - Surface the response fields (temporaryPassword, requiresPasswordChange) securely to privileged operators, ensuring the value is shown once and never persisted client-
    side.
  - Handle error responses (validation failures, 403, 409-style messages) with user-friendly prompts and enforce the closed role list (moderator/analyst) in the UI.
  - Provide onboarding guidance in the app to rotate the seeded super-admin credentials immediately and to manage credential resets once the future read/reset endpoints
    arrive.