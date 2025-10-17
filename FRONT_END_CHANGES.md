# Frontend Impact Summary

## Platform Web Client (Staff Users)
- Sign-in flows must use the updated OAuth metadata: tokens now expose `role` and `roles` arrays derived from `users.platform_role`; no `UserAccount` fields remain. Ensure role-guarded routes read `ROLE_SUPER_ADMIN`, `ROLE_MODERATOR`, or `ROLE_ANALYST` claims.
- Video upload forms must send the new `videoType` field when calling `POST /api/v1/videos`; the JSON part of the multipart request should include `videoType` (`PUBLIC` or `PRIVATE`).
- Moderation dashboards should display owner context: `VideoDto` responses now include `ownerId` and `videoType`. Update table columns or tooltips if ownership or visibility is displayed.
- Account management views should be refreshed after role changes; the `/api/v1/me` response now sources roles from the new aggregate and may include application user types in the future, so guard UI parsing against unexpected values.

## Shared Considerations
- Tokens minted after login contain updated claims; down-stream authorization checks should rely on `roles`, not the removed `superAdminProfile`.
- Any cached schemas or mocks must align with new DTO shapes (CreateVideoRequestDto, VideoDto, VideosMetadataDto). Update API client typings to keep CI contracts green.
