# Runtime Contract

The skill may create or update a target frontend implementation. A production runtime typically needs these interfaces:

- `validateDeck(deck)`
- `createDeck(input)` / `updateDeck(id, patch, version)`
- `getDeck(idOrSlug)`
- `publishDeck(id, visibility)`
- `unpublishDeck(id)`
- `createEmbedToken(id, origins, expiresAt)`
- `createVersion(id, message)` / `restoreVersion(id, versionId)`
- `uploadAsset(file, metadata)`

Never place runtime credentials in a generated deck spec. Publishing adapters must enforce authorization, origin allow-lists, content sanitization, rate limits, and audit logs.
