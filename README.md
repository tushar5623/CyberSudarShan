# Cyber Sudarshan

Cyber Sudarshan is a cybersecurity awareness and community application. It combines
educational content, blogs, cyber-news submissions, community chat, contact and
emergency-report forms, a password-strength indicator, and an email breach lookup
interface.

The repository contains a React single-page frontend and a separate Express API
with Mongoose models. It is under active security and architecture improvement.
**Automated checks pass, but production readiness and live database/provider
integration have not been established.**

## Current features

- Home, About, and Services pages with cybersecurity awareness and service information.
  The Services page describes offerings; it does not implement an automated
  penetration-testing engine.
- Signup and login with backend bcrypt password hashing and public name/email responses.
  Login does not issue a session, cookie, or token for subsequent API requests.
- Public blog listing and reading; shared-secret admin creation, editing, and deletion.
  Blog details are component state, not separate permalink routes.
- Approved cyber-news listing and public news-tip submission. Public submissions
  remain pending; admin listing, approval, deletion, and authorized publishing exist
  in the API. There is no current frontend news-moderation dashboard.
- Community chat with polling, optimistic sends, and visible send-failure handling.
  **Chat sender identity is client-controlled. Chat authentication and membership
  policy remain unresolved; the frontend's local-storage gate is not server authorization.**
- Contact and emergency-report submission interfaces with backend persistence
  handlers. These do not establish a staffed response service or response-time guarantee.
- A local password-strength heuristic and provider-backed email breach lookup.
  Neither is proof that an account or password is universally safe. Provider
  failures return an unavailable response rather than a successful safe result.

## Technology stack

| Area | Current implementation |
| --- | --- |
| Frontend | React 19, React Router DOM 7, Vite 7, Tailwind CSS 4, Lucide icons, AOS and tsParticles |
| Backend | Node.js, Express 5, CommonJS feature modules |
| Data models | Mongoose 9 / MongoDB; no database is provisioned by this repository |
| Passwords and request controls | bcryptjs 3, cors, express-rate-limit 8, dotenv |
| Verification | Node's built-in test runner, ESLint 9, Vite production build |

Each application has its own `package.json` and npm lockfile. Use the supplied
lockfiles rather than upgrading dependencies to follow these instructions.

## Architecture and key directories

```text
.
├── backend/
│   ├── server.js                    # Compatible npm start / CLI entry point
│   ├── security.js                  # Admin checks, CORS/proxy validation, limiters
│   ├── .env.example                 # Backend configuration template
│   ├── src/
│   │   ├── app.js                   # Express composition and route registration
│   │   ├── server.js                # Database initialization and HTTP startup
│   │   └── modules/
│   │       ├── auth/                # Signup/login routes and User model
│   │       ├── blogs/               # Blog routes and model
│   │       ├── breach/              # routes.js and feature-local provider.js
│   │       ├── chat/                # Chat routes and model
│   │       ├── contacts/            # Contact route and model
│   │       ├── emergencies/         # Emergency route and model
│   │       └── news/                # News routes and model
│   ├── models/Emergency.js          # Legacy model compatibility export
│   ├── test/                       # Security, contract, CORS and provider tests
│   └── SECURITY-CONTAINMENT.md
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Six existing frontend routes
│   │   ├── components/             # Page components and shared UI
│   │   ├── hooks/                  # Dialog and timer lifecycles
│   │   ├── lib/                    # API transport, subscriptions and UI helpers
│   │   └── assets/                 # Bundled assets
│   ├── test/                       # Unit, transport integration and browser fixture
│   ├── vite.config.js
│   └── vercel.json                  # SPA rewrite configuration
├── docs/                           # Contracts, architecture and verification records
└── .github/workflows/ci.yml         # Backend verification on Windows and Linux
```

The backend is a feature-based modular monolith. Routers retain their existing
handler and database-access logic; there is no generic controller/service framework.
Importing or constructing the app does not connect to MongoDB or listen on a port.
Startup validates configuration and waits for MongoDB before HTTP listening.
Feature modules do not own database startup.

Frontend backend requests pass through `frontend/src/lib/api.js`. The breach
provider boundary lives in `backend/src/modules/breach/provider.js`; it validates
responses and applies a ten-second request/body deadline.

## Prerequisites

- Node.js **22.19.0**, the version used by the recorded verification and CI workflow.
- npm; recorded local checks used **10.9.3**.
- Dependencies installed in **both** `backend/` and `frontend/`. The frontend
  transport integration tests also load the backend and its dependencies.
- An explicitly authorized, isolated MongoDB instance **only if starting the real
  backend**. It is not needed for the automated suites or mocked browser fixture.

Real MongoDB persistence verification was deliberately deferred. Do not point
development or tests at production data to bypass that limitation. See the
[dedicated database verification record](docs/database-persistence-verification.md)
for prerequisites and guarded setup instructions; those real-database procedures
have not been executed or proven by the automated suites.

## Local installation and development

Run from the repository root to install the locked dependencies:

```sh
cd backend
npm ci --include=dev
cd ../frontend
npm ci --include=dev
```

These are installation instructions, not actions performed while writing this
README. There is no root npm workspace or root start/test script.

### 1. Configure the backend before starting it

If `backend/.env` does not already exist, create it from
[`backend/.env.example`](backend/.env.example). Preserve any existing configuration.
Set `ADMIN_SECRET` and `MONGO_URI` yourself; the template intentionally has no
working secret or database URI. Explicitly set/uncomment `CORS_ALLOWED_ORIGINS` for
the frontend origin you will use. Do not start until these values are configured
and the database target's authorization and isolation are established.

From `backend/`, run either:

```sh
npm run dev
```

or `npm start` for the existing Node entry point without nodemon. CLI startup loads
`backend/.env` when run from this directory. Programmatic `createApp()`/`startServer()`
callers do not automatically load dotenv. The default API port is 5000. Missing
required configuration or failed MongoDB connection prevents successful startup.
The CLI does not specify a loopback HTTP bind host; control network exposure in
the runtime environment. The dedicated database guide documents a programmatic
startup with an explicit loopback host.

### 2. Configure the frontend API origin

Create `frontend/.env.local` with the **public local backend origin**, for example:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:5000
```

This assumes the isolated backend was successfully started on port 5000; adjust
it if you explicitly changed the backend port. No frontend environment template
currently exists. Vite loads this public setting; never put backend secrets here.

In another terminal, from `frontend/`:

```sh
npm run dev -- --host 127.0.0.1
```

Use the origin printed by Vite, normally `http://127.0.0.1:5173`. If it selects a
different port, update the backend's CORS allowlist and restart the backend. Changes
to frontend environment configuration require restarting Vite, or rebuilding for
production. The frontend has no configured Vite API proxy.

**Set the API override before local use.** Without `VITE_API_BASE_URL`, the helper
retains its existing deployed backend default in both development and production.
It does not default to localhost. Do not submit local test data to that deployed
default. The address is defined in the source; no live availability is asserted here.

### Optional: inspect the UI without a database

The existing loopback browser fixture serves synthetic API responses. From
`frontend/`:

```sh
node test/browser-fixture.mjs
```

Open `http://127.0.0.1:5188/__fixture` for scenario and synthetic-member controls.
Its process selects the local mock API origin. This does not start the real backend
or verify MongoDB persistence. Stop it after use. It is a manual browser fixture,
not an unattended E2E test runner; presentation assets may still use external URLs.

## Environment configuration

### Backend

| Variable | Requirement and behavior |
| --- | --- |
| `ADMIN_SECRET` | Required nonblank backend-only shared admin credential. No fallback exists. Compared exactly; never publish it in frontend configuration. |
| `MONGO_URI` | Required nonblank URI for an explicitly authorized database. Startup connects before listening. Do not use production data for local verification. |
| `PORT` | Optional; existing startup defaults to `5000`. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact HTTP(S) frontend origins. Required for browser clients and at startup with `NODE_ENV=production`. No wildcard, `null`, trailing slash, path, credentials, query or fragment. |
| `NODE_ENV` | Standard runtime environment setting. The CORS validator requires a configured nonempty allowlist when it is `production`. |
| `TRUSTED_PROXY_CIDRS` | Optional explicit IPs/nonzero CIDRs, comma-separated. Missing/empty trusts no proxy. Configure only verified proxy peers and header-sanitization behavior. |
| `AUTH_RATE_LIMIT_MAX` | Positive integer; default `10` requests/IP/15 minutes, with separate login and signup budgets. |
| `ADMIN_RATE_LIMIT_MAX` | Positive integer; default `60`/IP/15 minutes, shared across admin operations. |
| `PUBLIC_WRITE_RATE_LIMIT_MAX` | Positive integer; default `20`/IP/15 minutes independently for contact, emergency and news submission. |
| `CHAT_RATE_LIMIT_MAX` | Positive integer; default `60` chat writes/IP/minute. |
| `BREACH_RATE_LIMIT_MAX` | Positive integer; default `10` lookups/IP/minute across email addresses. |

For the documented local frontend, an explicit backend setting is:

```dotenv
CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

Origin matching includes scheme and port. When the variable is absent outside
production, the allowlist is empty and requests with an Origin header are rejected.
An explicitly blank/invalid value fails configuration in every environment. Unlisted
origins receive 403 before route handlers; allowed responses echo the origin with
`Vary: Origin`. Originless clients remain supported. CORS is not authentication and
does not stop a non-browser client from omitting or forging Origin.

### Frontend

`VITE_API_BASE_URL` accepts an absolute HTTP(S) backend origin without credentials,
path prefix, query or fragment; a trailing slash is normalized. Explicit blank or
invalid configuration fails rather than falling back. Production builds require
HTTPS. It is public, build-time configuration: changing a deployed value requires
a rebuild. Never store `ADMIN_SECRET`, `MONGO_URI`, passwords or provider credentials
in `VITE_*` variables.

## Test, lint and build commands

Run each command from its stated directory. No installation or database access is
performed by the documentation checks for this README.

| Directory | Command | Purpose |
| --- | --- | --- |
| `backend/` | `npm test` | Complete Node security, API contract, CORS, provider and startup suite. |
| `backend/` | `npm start` | Start through the compatibility wrapper; requires configured environment and MongoDB. |
| `backend/` | `npm run dev` | Start the same backend with nodemon. |
| `frontend/` | `node --test test/*.test.js` | All frontend tests, including six cross-project Express HTTP integration tests. There is no frontend npm test script. |
| `frontend/` | `npm run lint` | Full frontend ESLint check. |
| `frontend/` | `npm run build` | Vite production build into `frontend/dist/`. |
| `frontend/` | `npm run dev` | Vite development server. |
| `frontend/` | `npm run preview` | Local preview of an existing build; not a production hosting configuration. |
| Repository root | `git diff --check` | Whitespace checks for tracked changes. |

The suites use synthetic configuration, mock or forbid database operations, and
mock external provider responses. The six frontend integration tests use
Vite-transformed frontend transport against real Express HTTP listeners on loopback;
they do **not** verify a real database or mount React in a browser.

## Routes and API overview

Frontend routes are `/`, `/about`, `/services`, `/blogs`, `/login`, and `/community`.
`/services` renders `WebPenetrationPage.jsx`. Blog/news detail views do not add
additional URL routes.

All API paths are relative to the configured backend origin. Writes use JSON;
response envelopes differ by endpoint. Preserve the full
[API contracts](docs/api-contracts.md) when integrating clients.

| Area | Existing methods and paths | Access |
| --- | --- | --- |
| Contact | `POST /api/contact` | Public, rate limited |
| Emergency reports | `POST /api/emergency` | Public, rate limited |
| Accounts | `POST /api/auth/signup`, `POST /api/auth/login` | Public, independent auth limits |
| Admin verification | `POST /api/verify-admin` | Shared credential in `password` |
| Blogs | `GET /api/blogs` | Public listing |
| Blog management | `POST /api/blogs`, `PUT /api/blogs/:id`, `DELETE /api/blogs/:id` | Shared credential in `adminPassword` |
| News | `GET /api/news`, `POST /api/news` | Public approved listing and pending submission; explicit valid admin credential permits publication |
| News moderation | `POST /api/news/admin`, `PUT /api/news/approve/:id`, `DELETE /api/news/:id` | Shared credential in `adminPassword` |
| Chat | `GET /api/chat`, `POST /api/chat` | Public backend endpoints; writes rate limited |
| Breach lookup | `GET /api/breach/:email` | Public, rate-limited external-provider proxy |

Protected admin operations reject missing, malformed or incorrect credentials.
Public news cannot approve itself through a status/role flag. Contact and emergency
reports have no read/delete API in the current implementation. Breach successes
retain `{ "safe": true }` or `{ "safe": false, "breaches": [...] }`; provider failures
return redacted 502/504 responses, not proof of safety.

## Deployment configuration overview

- The frontend builds to `frontend/dist/`. `frontend/vercel.json` rewrites SPA
  requests to `/index.html`. It does not proxy API calls; those use the absolute
  configured backend origin.
- Set the public HTTPS `VITE_API_BASE_URL` before the production build. Configure
  backend-only `ADMIN_SECRET`, `MONGO_URI`, and the actual frontend origins in
  `CORS_ALLOWED_ORIGINS` before starting the backend. Do not guess hosted origins.
- The backend retains `npm start` / `backend/server.js` as its entry point. Database
  readiness precedes listening; bind failures reject startup and clean up resources
  owned by that attempt. There is no dedicated health/readiness endpoint.
- Configure trusted proxy peers only after verifying the hosting topology. Rate
  counters are in memory, reset on restart and are not shared across instances.
- `.github/workflows/ci.yml` defines backend syntax/tests on Windows and Linux with
  Node 22.19.0. It does not provision MongoDB, run frontend verification, or deploy.
  Hosted CI/deployment execution is not proven by the local records.

This repository does not provide an end-to-end deployment procedure or provision
hosting, TLS, a database, secret storage, or a shared rate-limit store. No deployment
is implied by the presence of hosting configuration.

## Security and responsible use

Keep secrets backend-only and out of source control. Local `.env*` files and
generated dependencies/build output are ignored; `.env.example` remains shareable.
Do not put production credentials in tests, screenshots, logs or issue reports.

Admin management uses a shared secret, not individual admin accounts or sessions.
Signup/login does not make local-storage identity trustworthy. **Chat sender identity
is currently client-controlled, and authenticated chat/membership policy is unresolved.**
Do not use displayed sender names as proof of identity or authorization.

Malformed auth input is rejected before account queries/hashing. Identified parser
and persistence-error paths use redacted responses/fixed logs. This is targeted
containment, not comprehensive validation, authentication or abuse prevention.
Account enumeration, bcrypt's 72-byte password behavior, chat attribution and
distributed rate enforcement still need explicit decisions. See the
[security hardening report](docs/security-hardening-1.md).

Use only authorized test accounts, data, email addresses and infrastructure. Do not
submit passwords, OTPs, tokens or sensitive personal information through chat or
test forms. The password indicator is a heuristic, and a breach lookup is not a
guarantee of safety. Service descriptions do not authorize testing third-party
systems; any security assessment requires the system owner's permission.

## Verification status and known limitations

Latest recorded results from Security Hardening Task 1:

| Check | Recorded result |
| --- | --- |
| Backend `npm test` | 72 passed, 0 failed, 0 skipped |
| Frontend `node --test test/*.test.js` | 40 passed in one command, 0 failed, 0 skipped |
| Frontend lint | 0 errors/warnings |
| Frontend production build | Passed; existing outdated-Browserslist-data warning remains |
| Plain JS/MJS syntax checks | 38 files passed; JSX checked by lint/build |

These are previously executed results recorded in the repository reports, not new
test runs performed while writing this README. They do not prove real-world
deployment security or production readiness.

- **Real MongoDB persistence verification was deliberately deferred.** Stored-data
  durability, physical indexes and database-backed cleanup have not been verified.
- Provider behavior was tested with mocks. Live provider compatibility and actual
  no-breach response semantics remain unverified; the current fail-closed policy
  can report unavailable for provider error/no-result envelopes.
- Earlier local browser checks used mocked APIs. They do not establish a live
  browser-to-backend-to-MongoDB workflow. Browser verification of the latest CORS
  hardening, staging/hosted configuration and the deployed application is outstanding.
- The local production-preview routing check verified HTML fallback for six paths,
  not a browser running the deployed bundle or Vercel's hosted behavior.
- Chat returns the oldest 100 messages under its current ascending query. It has
  no trusted ownership, and network ambiguity can lead to duplicate manual retries.
- Existing reports contain historical snapshots and earlier test counts. Some
  architecture notes predate the extracted fail-closed breach provider; current
  source, contract amendments and the latest security report take precedence.

## Repository documentation

- [API contracts and security amendments](docs/api-contracts.md)
- [Security Hardening Task 1: fixes, tests and remaining decisions](docs/security-hardening-1.md)
- [Backend containment and operational configuration](backend/SECURITY-CONTAINMENT.md)
- [Architecture and ownership history](docs/architecture.md)
- [Frontend API configuration and transport history](docs/frontend-api.md)
- [Integration readiness and verification boundaries](docs/integration-readiness.md)
- [Dedicated database verification: deferred status and guarded setup](docs/database-persistence-verification.md)
- [Frontend Task 1: lint and lifecycle improvements](docs/frontend-task1.md)
- [Frontend Task 2: mocked browser verification and reliability fixes](docs/frontend-task2.md)
- [Migration verification history](docs/verification.md)
