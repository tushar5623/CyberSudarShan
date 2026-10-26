# API contract baseline before structural migration

## Security Hardening Task 1 amendments

The historical baseline below is superseded only for these security corrections:

- Browser requests now require an exact `Origin` in backend-only
  `CORS_ALLOWED_ORIGINS`. Disallowed origins return 403 before handlers, with
  `{ "success": false, "error": "Forbidden", "message": "Origin not allowed." }`.
  Allowed responses echo the configured origin with `Vary: Origin`, not `*`.
  Originless clients remain supported. Missing origins configure an empty allowlist
  outside production; `NODE_ENV=production` requires a valid nonempty list at startup.
- Auth fields must be scalar strings: nonblank email, nonempty password and (for
  signup) nonblank name. Invalid shapes/types now return 400 with `success:false`
  and `message:"Invalid login data."` or `"Invalid signup data."`, before DB/bcrypt.
  Passwords/account identifiers are not trimmed or normalized before use.
- Parser errors no longer return default HTML/stack/body fragments. HTTP 400/415
  returns `{ "success": false, "error": "Invalid request body.", "message": "Invalid request body." }`;
  HTTP 413 uses `"Request body too large."` in both fields. This intentional error-
  contract change prevents credential/body disclosure. Statuses and parser limit
  remain unchanged. Denied-origin errors have no CORS allow-origin header.

All valid success bodies, 17 paths/methods, shared-secret admin rules and limiter
budgets remain intact. See [hardening evidence](security-hardening-1.md) for tests,
deployment configuration requirements and unresolved identity/password risks.

This records the current implementation, including Phase 2 containment and the
Express 5 bind-error correction. It is a compatibility baseline, not a claim that
all existing behavior is desirable. Changes to security policy or known defects
must be reviewed explicitly rather than hidden inside file moves.

## Request and response conventions

Paths below are relative to the configured backend origin. Request bodies are
JSON. Successful reads return arrays directly; there is no common data wrapper.
Mongoose documents retain existing field names, `_id`, dates serialized as ISO
strings, and any existing version metadata. No collection/schema migration is
authorized by this baseline. Error envelopes intentionally differ by endpoint.

Step 5 centralizes the frontend's Render backend origin in `frontend/src/lib/api.js`
and migrates its existing callers without changing endpoint contracts. The same
deployed origin remains the default; optional `VITE_API_BASE_URL` is public,
build-time configuration. See [frontend transport](frontend-api.md) for validation,
preserved UI error-policy differences and verification limits.

## Endpoint inventory

| Method and path | Request/access | Successful status and JSON |
| --- | --- | --- |
| `POST /api/contact` | Public: `name`, `email`, `message` | 201: `{ "message": "Data Saved to Cloud!" }` |
| `POST /api/emergency` | Public: `name`, `email`, `mobile`, `problem` | 201: `{ "message": "Emergency reported successfully! We will contact you soon." }` |
| `POST /api/auth/signup` | Public: `name`, `email`, `password` | 201: `{ "success": true, "message": "Account created successfully!", "user": { "name": "…", "email": "…" } }` |
| `POST /api/auth/login` | Public: `email`, `password` | 200: `{ "success": true, "message": "Login successful!", "user": { "name": "…", "email": "…" } }` |
| `POST /api/verify-admin` | Shared credential in `password` | 200: `{ "success": true }` |
| `GET /api/blogs` | Public | 200: blog-document array |
| `POST /api/blogs` | `title`, `author`, `content`, valid `adminPassword` | 201: created blog document, not a success wrapper |
| `PUT /api/blogs/:id` | `title`, `author`, `content`, valid `adminPassword` | 200: `{ "success": true, "message": "Blog updated successfully!" }` |
| `DELETE /api/blogs/:id` | Valid `adminPassword` in JSON body | 200: `{ "success": true, "message": "Blog deleted successfully!" }` |
| `GET /api/news` | Public | 200: approved-news-document array |
| `POST /api/news/admin` | Valid `adminPassword` | 200: all-news-document array, including pending items |
| `POST /api/news` | `title`, `summary`, `fullDetails`, `type`, optional `imageUrl`; optional explicit `adminPassword` | 201: `{ "success": true, "message": "Sent for verification!" }` publicly; `"News Live!"` for valid admin publishing |
| `PUT /api/news/approve/:id` | Valid `adminPassword` | 200: `{ "success": true, "message": "News Approved & Live!" }` |
| `DELETE /api/news/:id` | Valid `adminPassword` in JSON body | 200: `{ "success": true, "message": "News deleted!" }` |
| `GET /api/chat` | Public in current backend | 200: chat-document array |
| `POST /api/chat` | Public: `message`, optional `sender` | 201: `{ "success": true, "message": "Message sent!" }` |
| `GET /api/breach/:email` | Public external-provider proxy | 200: `{ "safe": true }` or `{ "safe": false, "breaches": ["…"] }` |

Blog documents contain title/author/content/date; news contains
title/summary/fullDetails/type/imageUrl/status/date; chat contains
sender/message/timestamp, alongside MongoDB document metadata. Listing currently
sorts blogs/news newest first. Chat currently sorts ascending and limits to 100,
which returns the oldest window; fixing that is not part of structural migration.
An omitted/empty chat sender falls back to `Anonymous User` in the write handler.

## Authorization, rate limits and startup invariants

- All protected blog/news endpoints and admin verification reject missing,
  blank, non-string or incorrect credentials with 401 and
  `{ "success": false, "error": "Unauthorized", "message": "Invalid admin credentials." }`.
  JSON parser failures may instead return 400 before reaching these guards.
- Public news ignores supplied approval/role flags and stores `pending`.
  Explicit valid `adminPassword` stores `approved`; explicit invalid credentials
  return 401 with no write. This is shared-secret authorization, not user sessions.
- Login and signup independently allow 10 requests/IP/15 minutes; the admin
  routes share 60/IP/15 minutes. Contact, emergency and news each independently
  allow 20/IP/15 minutes. Chat writes allow 60/IP/minute; breach lookups allow
  10/IP/minute. Existing environment overrides remain supported.
- Exceeded budgets return 429 with `success: false`, identical `error`/`message`
  text `Too many requests. Please try again later.`, `Retry-After`, and standard
  rate-limit headers. Explicit admin news requests count in both budgets.
- Preserve default proxy distrust, explicit trusted-proxy allowlisting, IPv6
  key normalization, in-memory-store limitations, and shared limiter instances.
- Configuration must fail closed; MongoDB must connect before binding; startup
  succeeds only on `listening`. Callback/event bind errors reject, server cleanup
  is attempted, owned database connections are disconnected once, and cleanup
  failure cannot replace the original bind error.

## Existing errors to preserve during extraction

| Situation | Status/body |
| --- | --- |
| Signup email already exists | 400: `{ "success": false, "message": "Email already registered!" }` |
| Login user absent | 404: `{ "success": false, "message": "User not found!" }` |
| Login password incorrect | 400: `{ "success": false, "message": "Invalid credentials!" }` |
| Blog update/delete finds no record | 404: `{ "success": false, "message": "Blog not found" }` |
| Empty chat message | 400: `{ "success": false, "message": "Message is required" }` |
| Contact persistence failure | 500: `{ "error": "Failed to save data" }` |
| Emergency persistence failure | 500: `{ "message": "Server Error! Please try again." }` |
| Blog creation/read failure | 500: `{ "error": "Failed to post blog" }` / `{ "error": "Failed to fetch blogs" }` |
| News/chat read failure | 500: `{ "success": false, "message": "Error fetching news" }` / `"Error fetching chats"` |
| Auth, blog mutation, news write/admin failures; chat write failure | 500: `{ "success": false, "message": "Server error" }` |
| Breach HTTP/network/JSON/schema failure | 502: `{ "error": "Breach lookup unavailable. Please try again later." }` |
| Breach provider timeout | 504: same non-sensitive error body |

Comprehensive validation, invalid ObjectId handling, missing-news-record handling,
account enumeration, chat identity
spoofing, and common error middleware remain separate work. Tests do not endorse
these gaps; approved fixes should intentionally update the relevant baseline.

## Frontend paths and coverage

Preserve `/`, `/about`, `/services`, `/blogs`, `/login`, and `/community`.
Blog details remain local component state, not a new permalink contract.
No frontend files changed in this step.

`backend/test/security.test.js` retains all 29 Phase 2 tests, including route
inventory, rate limiting, authorization and real occupied-port startup behavior.
`backend/test/api-contracts.test.js` adds nine HTTP characterization tests spanning
all 17 API method/path combinations, success payloads, representative failures,
document serialization and write arguments. Tests use loopback HTTP, real
Express/Mongoose document construction, mocked persistence and mocked provider
calls. They do not verify real MongoDB durability/indexes, browser behavior or the
complete external provider contract.

## Authentication/chat extraction: unresolved risks

Step 3C moves the existing User/Chat models and handlers into feature modules.
It does not add sessions, tokens, cookies, email verification or new authorization.
Signup continues to hash with bcrypt cost 10; login compares against the existing
stored hash and returns only name/email. Existing hashes are not migrated or
rewritten. Distinct duplicate-account, unknown-user and wrong-password responses
still permit account enumeration; normalization, stronger validation and live
unique-index verification remain separate work.

The backend chat read/write endpoints remain public. A submitted sender is an
unverified display label, not an authenticated identity, and can be impersonated.
Frontend local storage and client-supplied role claims do not establish identity
or privileges. The extraction preserves this existing behavior rather than
claiming to secure it. Session-backed identity, access control, moderation and
retention require separately approved changes. The existing oldest-100 chat query
also remains unchanged.

Three additional characterization tests cover existing-hash login, signup cost/
duplicate-write behavior, and chat text/sender/server-timestamp storage. Together
with the Step 3A coverage, the expected suite now contains 44 tests. These use
synthetic credentials and mocked persistence, not production accounts or records.

## Breach extraction: historical Step 3D behavior

The provider failure behavior in this historical section is superseded by Step 4B
below. Successful endpoint response shapes and limiter ownership remain unchanged.

Step 3D extracts the single existing handler into `src/modules/breach/routes.js`.
There was no separate provider client to relocate; a provider layer is unnecessary
for this structural step. The router receives the original `security.breachLimit`
instance (10/IP/minute by default, configurable through `BREACH_RATE_LIMIT_MAX`).
The budget covers different email addresses together and blocks provider calls
after exhaustion. Provider requests occur only when handling a lookup.

The decoded route email is interpolated into the same XposedOrNot URL. Provider
404 returns HTTP 200 with `{ "safe": true }` without parsing JSON. Other statuses
are parsed as JSON; an array in `breaches` is flattened one level. Nonempty arrays
return `{ "safe": false, "breaches": [...] }`; empty, absent or non-array breach
fields return `{ "safe": true }`. Fetch/JSON exceptions are logged and return
HTTP 500 with `{ "error": "Server Error" }`.

Confirmed existing fail-open risk: non-404 provider failures, including 429/500
responses containing error JSON without a breach array, are reported as safe.
The handler does not check `response.ok`, validate the provider schema or impose
an explicit timeout. A safe response therefore does not prove absence of a breach
or even a successful provider lookup. These behaviors and the existing raw error
logging remain unchanged; status/schema validation, an explicit unknown/error
outcome, timeout handling and logging review require a separate security task.

Three added HTTP characterization tests cover the decoded outbound URL/404
short circuit, existing fail-open JSON cases, and invalid-JSON error handling.
The expected suite now contains 47 tests. All provider calls are mocked; real
provider availability, schema compatibility and operational limits remain unverified.

## Step 4B: breach provider failures are unavailable, not safe

`GET /api/breach/:email` retains its existing route parameter handling (no new
email validation/encoding), provider URL, limiter instance and 10/IP/minute default
budget. Only a 2xx response with a valid JSON object containing a `breaches` array
can return HTTP 200. The array is flattened one level as before; every resulting
entry must be a nonblank string. Empty arrays return `{ "safe": true }`; nonempty
arrays return `{ "safe": false, "breaches": [...] }`, retaining original entries.
Optional `status` must equal `"success"` if present. Envelopes containing `Error`,
`error` or `errors` are rejected even if a breach array is also present.

All non-2xx provider statuses, including 404/429/500, network failures, malformed
JSON and unexpected response shapes return HTTP 502. A fixed 10-second deadline
covers fetching headers and consuming the JSON body; expiry aborts the provider
request and returns HTTP 504. Both statuses use the same stable JSON body:

```json
{ "error": "Breach lookup unavailable. Please try again later." }
```

The existing error object convention is retained, but the old HTTP 500/body and
unconditional 404-to-safe shortcut intentionally change. Redirects are rejected
instead of followed. Errors are logged only as the fixed message
`Breach lookup provider request failed.`; upstream bodies, headers, credentials,
queried emails and exceptions are not included. The deadline timer is cleared and
the provider request is aborted on every completed path, including HTTP failures.
The local limiter still returns its existing 429 response before contacting the
provider; an upstream 429 instead means unavailable and returns 502.

The provider's [public documentation](https://xposedornot.com/api_doc) describes
`{"Error":"Not found","email":null}` as its no-breach envelope. This fix deliberately
does not translate an HTTP error or error envelope into safe. Consequently normal
provider no-result cases using that envelope can now return unavailable. Restoring
such a translation requires a separately agreed, verified provider contract; a
generic 404 alone cannot establish absence of breaches. The existing frontend
already checks HTTP success and displays an error on non-success responses; no
frontend change is included or browser verification claimed.

The corrected tests cover valid empty/detected arrays, 404/429/500, network/JSON
failures, invalid and contradictory shapes, redacted errors, and deadline expiry
while awaiting headers and the body. All provider calls are mocked; no live email
lookup was performed. A safe response means no detected breaches in the accepted
provider response, not proof of universal safety. Provider accuracy, payload size
limits, availability and the real no-result contract remain verification gaps.
