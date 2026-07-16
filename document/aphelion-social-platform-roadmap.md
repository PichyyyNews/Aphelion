# Aphelion Social Platform Roadmap

Status: Product direction. This document records the target product and delivery order; it does not authorize building every feature at once.

## Product thesis

Aphelion will evolve from an identity platform into a social platform for Developers and AI builders.

- Follow people and discover their work through a social feed.
- Publish Markdown posts, share projects/repositories, and display technology stacks.
- Collaborate in chat with Markdown, code snippets, files, and repository links.
- Protect people from accidental secret exposure by detecting and censoring sensitive key/value data before it reaches another user.

Build identity first, social core second, and realtime collaboration last. Chat and file transfer must not ship before their security gates.

## Current foundation

- Email/password login, GitHub and Google OAuth configuration, sessions, roles, and admin controls.
- App navigation for authenticated users.
- Next.js, TypeScript, Prisma, PostgreSQL, Redis, Docker, and shadcn/ui.

New features must extend these systems rather than recreate auth or user management.

## Scope map

| Area | User capability | Planned phase |
|---|---|---|
| Developer identity | Profile, bio, links, skills, stack, featured repos | 1-2 |
| Social graph | Follow, unfollow, followers, following | 1 |
| Publishing | Markdown post, reactions, repost/share, bookmarks | 2-3 |
| Discovery | Home feed, profiles, people/post/stack search | 2 |
| Collaboration | 1:1 and group chat, snippets, files, repository links | 4 |
| Safe sharing | Secret censoring, file policy, malware scan | 4 before public chat |
| AI capabilities | Drafting, code explanation, moderation assistance | 5 |
| Governance | Reporting, moderation queue, audit, anti-spam | Every public feature |

## Delivery phases

### Phase 0: Stabilize the foundation

- Finish auth hardening: email verification, rate limit, password reset, and live OAuth smoke tests.
- Establish Prisma migration workflow before social models grow.
- Select storage and realtime vendors, but do not enable uploads or chat.

Done when: login/logout, admin controls, and deployment are stable without losing user data.

### Phase 1: Developer identity and social graph

- Public profile: handle, display name, bio, avatar, links.
- Follow/unfollow with follower and following counts.
- Public/private profile setting and user block.
- Public profile route, profile editor, and follower/following lists.

Do not add chat, uploads, or AI generation in this phase.

### Phase 2: Posts, feed, stacks, and discovery

- Markdown post with draft, publish, and delete.
- Chronological home feed from followed accounts for the MVP.
- Tags, external links, repository links, and tech-stack tags.
- Reaction, bookmark, and repost that always references the original post.
- Tech stack directory for languages, frameworks, databases, cloud services, and AI tools.
- People, post, and stack search using PostgreSQL first.

Done when: a user can post, follow someone, and see the permitted post in their feed without privacy leakage or N+1 queries.

### Phase 3: Project and repository showcase

- Project card: title, summary, image, demo URL, repository URL, and stack.
- Featured projects on profiles.
- Public GitHub metadata/link previews only.
- Optional repository import only after explicit OAuth consent.

Never clone private repositories or retain provider tokens unnecessarily. Encrypt any token that must be retained.

### Phase 4: Realtime chat and safe sharing

- Start with 1:1 conversations; add groups after delivery is reliable.
- Plain text and sanitized Markdown messages.
- Immutable code snippets with selected programming language.
- File attachments in object storage through signed URLs.
- Repository sharing as a link preview, not a repository copy.

#### Secret censoring gate

1. Scan in the client for immediate feedback.
2. Scan again on the server for every message and file.
3. Detect known token patterns, private keys, `.env` assignments, and high-entropy strings.
4. Mask previews, such as `sk-...9F2A`; never write raw secrets to analytics or audit logs.
5. Block private keys and high-confidence secrets by default; require the sender to edit the content.
6. Keep only finding metadata: type, confidence, and message/file reference.

#### File safety gate

- Enforce MIME type, extension, count, and size limits.
- Upload first to quarantine storage.
- Scan for malware before generating a download URL.
- Delete the object, metadata, and access grants according to the retention policy.

Done when: Markdown is sanitized, snippets never execute, files pass policy and scan, and recipients never receive a detected secret.

### Phase 5: AI-native capabilities

- Explicit opt-in post drafting, rewriting, and discussion summarization.
- Code explanation and suggested stack/tags.
- AI-assisted moderation that recommends rather than automatically bans.
- Per-user usage limits, cost tracking, consent, and retention policies.

Do not send private messages, attachments, or private repositories to an AI provider without explicit consent and a policy.

### Phase 6: Moderation and scale

- Report post/profile/message, moderation queue, and appeal flow.
- Block/mute, anti-spam, and rate limits.
- Audit every moderation and sensitive admin action.
- Background jobs, notifications, observability, and feed ranking.

## Data model direction

Do not add these Prisma models until their phase begins, with migration and API tests in the same change.

| Domain | Expected models |
|---|---|
| Profile | `Profile`, `ProfileLink`, `TechStack`, `UserTechStack` |
| Social graph | `Follow`, `Block`, `Mute` |
| Content | `Post`, `PostTag`, `Reaction`, `Bookmark`, `Repost`, `Project` |
| Chat | `Conversation`, `ConversationMember`, `Message`, `CodeSnippet`, `MessageAttachment` |
| Files/security | `FileAsset`, `FileScan`, `SecretScanFinding`, `AccessGrant` |
| Governance | `Report`, `ModerationCase`, `ContentModerationAction`, `Notification` |

Relationship rules:

- `Follow` is unique on `(followerId, followingId)` and cannot target the same user.
- Posts carry an author, visibility setting, and soft-delete strategy.
- Every message read/write verifies conversation membership server-side.
- Files stay private until scan passes and authorization is verified.
- Secret findings never persist the raw secret.
- Moderation and admin actions write an `AuditLog`.

## Architecture direction

| Need | Starting direction |
|---|---|
| Database | PostgreSQL + Prisma |
| Cache, rate limit, jobs | Redis |
| File storage | S3-compatible object storage with quarantine bucket and signed URLs |
| Realtime | Managed WebSocket provider or dedicated Socket.IO worker in Phase 4 |
| Rich content | Markdown only, sanitized server-side; never raw user HTML |
| Search | PostgreSQL full-text first; dedicated search only when scale requires it |
| Background work | Queue worker for scans, thumbnails, notifications, and feed fan-out |

## Non-negotiable API and permission rules

- Authorize every server mutation and resource read; never trust client-provided IDs alone.
- Apply block and visibility rules before feed pagination.
- Validate mutations with Zod and rate-limit by risk.
- Scope signed upload/download URLs to one user, one file, and a short expiry.
- Enforce message membership, Markdown sanitation, secret scanning, and file scanning on the server.

## Recommended order from today

1. Finish and commit the current auth, admin, and app-shell work.
2. Add `Profile`, `Follow`, and `Block` migrations.
3. Build profile edit and public profile routes.
4. Build follow/unfollow with authorization tests.
5. Add Markdown-only posts and profile feeds.
6. Add home feed, reactions, bookmarks, and search.
7. Decide object storage, realtime, and malware-scan providers.
8. Implement the file and secret-safety pipeline before enabling chat.
9. Add AI only after consent, quotas, and retention controls exist.

## Decisions required before each feature

- Can a handle change, and will old profile URLs redirect?
- Is the MVP public-only posts or does it include follower/private visibility?
- What are the maximum file size, retention period, and allowed MIME types?
- Which providers handle storage, realtime delivery, and malware scan?
- Which AI provider, retention policy, consent screen, and quota model apply?
- Who may view reported content and for how long is evidence retained?

## Definition of success

The social MVP is successful when a developer can create a profile, show their stack, follow people, write a Markdown post, and discover followed creators safely.

Chat, files, and AI are successful only when authorization, redaction/scanning, auditability, and abuse controls are complete, not merely when a message can be sent.
