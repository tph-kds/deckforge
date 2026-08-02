# Security

Treat deck content, imported documents, remote media, embeds, and collaboration payloads as untrusted. The DeckProject schema is a content contract, not an authorization boundary.

## Content safety

Use semantic structured blocks. Sanitize rich text and SVG with an allow-list. Reject scripts, event-handler attributes, unsafe CSS, `javascript:` URLs, data URLs outside approved media cases, and unknown protocols. Validate asset MIME type, extension, size, dimensions, and processing result. Never execute macros or code imported from office documents.

## Embeds and links

Allow only approved providers or sandboxed iframes. Validate URLs server-side, constrain permissions, and document any use of `allow-scripts`, `allow-same-origin`, camera, microphone, clipboard, or fullscreen. Use origin allow-lists and validate all `postMessage` traffic.

## Authorization

Enforce deck ownership, workspace membership, role, publication state, version access, comment access, and asset access on the server. Client-supplied visibility, owner IDs, or embed settings cannot grant permission. Use revocable, scoped, expiring tokens for shares and embeds where required.

## Data handling

Keep secrets and provider keys server-side. Do not include private notes, comments, source documents, internal URLs, or audit metadata in public payloads. Define retention, deletion, backups, audit logs, and analytics privacy.

## Collaboration and persistence

Validate operations against the schema and current authorization before applying them. Rate-limit expensive imports, exports, thumbnail generation, and public endpoints. Protect against oversized documents, decompression bombs, recursive structures, and asset abuse.

## Verification

Test malicious HTML/SVG, invalid protocols, denied origins, forged owner fields, revoked links, expired tokens, private-note leakage, cross-tenant asset access, oversized uploads, and embed escape attempts. Document residual risk and security-sensitive configuration.
