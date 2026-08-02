# Publish and Embed

Publishing is a runtime capability with security and lifecycle implications. Keep it separate from local draft editing.

## Lifecycle

Define draft, private, workspace, unlisted, and public states as appropriate. Specify who can create, update, publish, unpublish, transfer, archive, restore, and delete. Version each publication so a deck can be restored and links can identify the current or pinned version. Handle slug conflicts and redirects deliberately.

## Public route

The audience route should load a validated immutable snapshot, not expose editor state directly. Exclude comments, private notes, edit history, unpublished sources, access tokens, and internal asset metadata. Decide caching, CDN, custom domain, search indexing, analytics, and download policy explicitly.

## Embeds

Require an iframe title, responsive sizing contract, loading state, origin allow-list, sandbox flags, referrer policy, and a versioned `postMessage` protocol for events such as ready, slide change, resize, completion, and error. Validate message origin and payload on both sides. Avoid `allow-same-origin` or scripts unless the content and threat model justify them.

## Sharing

Support revocable share links and expiring tokens where needed. Never encode durable authorization only in an easily copied client value. Make visibility and current publication state obvious in the editor.

## Analytics and privacy

Collect only approved events, document retention, and avoid exposing audience identities or private deck content. Respect consent and organizational policy.

## Verification

Test publish, update, rollback, unpublish, revoked access, expired token, allowed and denied origins, cache invalidation, embed resizing, browser privacy modes, broken assets, and direct deep links. Runtime authorization, sanitization, rate limiting, and audit logs are mandatory boundaries.
