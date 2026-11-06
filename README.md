# Cyber Sudarshan

Cyber Sudarshan is a full-stack cybersecurity awareness and community application
built with React, Express, and MongoDB. It includes educational blogs, moderated
news, authenticated community chat, contact and incident-report forms, a local
password-strength estimate, and a provider-backed email-breach lookup.

The engineering focus is explicit trust boundaries, bounded input and database work,
reproducible tooling, and regression-tested failure handling. This is a portfolio
application, not a certified security product or staffed emergency-response service.

## Engineering highlights

- Feature-based backend modules with independently importable app and startup layers.
- bcrypt password hashing and opaque, revocable, database-backed login sessions.
- Authenticated chat authorship; sender identity no longer comes from client input.
- HTTP validation before database coercion, strict IDs, exact-origin CORS, field
  allowlists, rate limits, and redacted errors.
- Paginated blog/news queries with stable ordering and supporting indexes; newest-100
  chat history returned chronologically.
- Fail-closed breach-provider integration and a complete request/body deadline.
- Shared frontend transport with deadlines, cancellation, polling cleanup, optimistic
  rollback, and reusable pagination.
- Liveness/readiness endpoints, database-first startup, and bounded graceful shutdown.
- Full-stack Windows/Linux CI, dependency audits, formatting, lint, tests, and build.

## Quick start

Use Node **22.19.0** (`.nvmrc`) and npm. From the repository root:

```sh
npm ci
npm run setup
```

Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to
`frontend/.env.local`. Set values for an isolated development environment:

```dotenv
# backend/.env
ADMIN_SECRET=replace-with-a-long-random-secret
MONGO_URI=mongodb://127.0.0.1:27017/cybersudarshan_dev
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

```dotenv
# frontend/.env.local — public build-time configuration
VITE_API_BASE_URL=http://127.0.0.1:5000
```

No database is provisioned by this repository. Do not use production data for local
development or tests. Start each application in a separate terminal:

```sh
npm --prefix backend run dev
npm --prefix frontend run dev
```

The API defaults to port 5000. The frontend's origin must exactly match the backend
CORS allowlist, including the port.

## Verification

```sh
npm test                 # Backend and frontend unit/integration tests
npm run lint             # ESLint for both applications
npm run format:check     # Formatting verification
npm run format           # Apply formatting
npm run build            # Production frontend build
npm run check            # Format check, lint, tests, and build
```

Production builds require an explicit HTTPS `VITE_API_BASE_URL`. For an isolated
build check, CI uses the reserved `https://api.example.invalid` origin; that output
is not a live deployment. Tests use synthetic data, mocked persistence/providers,
and loopback HTTP. See the [quality review](docs/quality-review.md) for tested
boundaries and remaining work.

## Architecture

```text
backend/
  src/app.js                 Express composition, headers, health, error boundary
  src/server.js              Configuration, database startup, shutdown
  src/validation.js          HTTP field and identifier validation
  src/pagination.js          Bounded list queries
  src/modules/
    auth/                    Accounts and opaque sessions
    blogs/                   Public reads and admin CRUD
    news/                    Public tips and admin moderation
    chat/                    Public feed and authenticated writes
    breach/                  External-provider adapter
    contacts/                Contact submissions
    emergencies/             Incident-report submissions
  security.js                Admin, CORS, proxy, and rate-limit policy
  test/                      Contract, security, failure, lifecycle tests
frontend/
  src/components/            Existing pages and interface
  src/lib/                   Transport, sessions, chat, dialog utilities
  src/hooks/                 Pagination and lifecycle hooks
  test/                      Unit and Express transport integration tests
.github/workflows/ci.yml      Full-stack verification and audits
```

Importing the backend app does not open a database connection or listener. Routes
select accepted fields explicitly, while Mongoose models add persistence constraints.
Frontend code receives no database or admin configuration.

## API and access

| Area | Endpoints | Access |
| --- | --- | --- |
| Health | `GET /health/live`, `GET /health/ready` | Public; readiness returns 503 when unavailable |
| Accounts | `POST /api/auth/signup`, `/api/auth/login`, `/api/auth/logout` | Rate-limited login/signup; logout revokes the supplied session |
| Blogs | `GET/POST /api/blogs`, `PUT/DELETE /api/blogs/:id` | Public reads; shared-secret admin writes |
| News | `GET/POST /api/news`, `POST /api/news/admin`, moderation routes | Public approved reads and pending tips; admin moderation |
| Chat | `GET/POST /api/chat` | Public reads; valid bearer session required to send |
| Contact/incidents | `POST /api/contact`, `POST /api/emergency` | Public, validated, rate-limited |
| Breach lookup | `GET /api/breach/:email` | Public, validated, rate-limited |

Login returns public user fields including `user.id` and an `X-Session-Token` header
exposed through CORS. Send it as `Authorization: Bearer <token>` for chat writes and
logout. Sessions expire after eight hours; MongoDB stores only token hashes. The
browser uses tab-scoped `sessionStorage`. Existing local-storage users must log in
again, and old chat records have no verified ownership.

Blog/news listing accepts `limit=1..100` and `offset=0..10000` (defaults: 100 and 0).
The response remains an array; `X-Has-More` indicates another page. Offset pagination
can shift during concurrent edits, so a larger feed should migrate to cursors.

Admin operations retain the existing `adminPassword` body field; verification uses
`password`. Never place this secret in a `VITE_*` variable. Invalid payloads and IDs
return 400, invalid login/session returns 401, missing records return 404, rate limits
return 429, and provider failures return 502/504 rather than a false “safe” result.

## Deployment notes

- Build `frontend/dist/` with the real HTTPS API origin. `frontend/vercel.json`
  provides SPA fallback; environment changes require rebuilding.
- Start the API with `npm --prefix backend start`. Configure `ADMIN_SECRET`,
  `MONGO_URI`, `NODE_ENV=production`, and explicit `CORS_ALLOWED_ORIGINS`.
- Configure `TRUSTED_PROXY_CIDRS` only for verified proxy peers. Terminate TLS at the
  hosting proxy and prevent unintended direct exposure.
- Poll `/health/live` for process health and `/health/ready` for database readiness.
- Verify the declared unique, TTL, and ordering indexes on the actual database before
  launch. Schema declarations do not prove indexes exist in an existing database.
- Rate limits use process memory. Multiple replicas need a shared store.

## Current limits

Production readiness still requires an isolated real-database run, automated browser
E2E coverage, staging deployment, backup/restore testing, monitoring, and load tests.
No live deployment was performed during this review.

Admin access remains a shared secret rather than individual roles and audit history.
There is no password recovery, email verification, MFA, or chat moderation workflow.
Signup discloses duplicate email registration. Browser-readable bearer sessions remain
exposed to XSS; an HttpOnly-cookie design would need matching deployment and CSRF work.
The breach provider's live response semantics have not been verified.

The password checker is an educational heuristic, not a guarantee. Service text does
not implement an automated penetration-testing engine. Only assess systems you are
authorized to test.

## Documentation

- [Quality review and migration notes](docs/quality-review.md)
- [Contributing workflow](CONTRIBUTING.md)
- [Security policy and trust boundaries](SECURITY.md)
- [API contract history](docs/api-contracts.md)
- [Database verification guide](docs/database-persistence-verification.md)
