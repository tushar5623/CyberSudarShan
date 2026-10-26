# Backend ownership and stabilization audit

Step 4A, 18 October 2026. This describes the inspected working tree after Step 3D,
including uncommitted Phase 2 containment and migration work. It is not a claim
of production readiness. [API contracts](api-contracts.md) remain the compatibility
baseline; [verification](verification.md) records execution and limitations.

This retains the historical Step 4A audit. Step 4B subsequently corrected breach
failure handling, and the later provider-boundary extraction moved transport and
response validation into a dedicated feature-local module. The current ownership
row and [provider boundary](#current-breach-provider-boundary) below reflect that
implementation. The original fail-open finding is historical, not current behavior;
see also [the breach contract](api-contracts.md#step-4b-breach-provider-failures-are-unavailable-not-safe).

## Decision for this step

Keep runtime files and tests in their current locations. Their responsibilities
are sufficiently centralized for the next review gate; no demonstrated defect
requires a configuration/middleware split now. Document ownership before moving
code. Creating empty directories or forwarding layers solely to match target
names would add imports without reducing current coupling.

All existing source, test assertions, dependency versions, collection identities,
route order, response contracts and startup cleanup remain unchanged in Step 4A.
This step adds this ownership record and appends the current verification record.

## Current owners and boundaries

| Responsibility | Current owner and evidence | Boundary to preserve |
| --- | --- | --- |
| Hosting/CLI compatibility | `backend/server.js:1-8` | Imports and re-exports `createApp`/`startServer`; runs CLI only as main. `npm start` remains `node server.js`. |
| Environment loading | `backend/src/server.js:50-61` | Only `runCli()` loads dotenv. Neither importing the app nor constructing it loads `.env`. Library callers supply `env` or deliberately use `process.env`. |
| Security configuration validation | `backend/security.js:5-37,55-71` | `createSecurity(env)` rejects blank/non-string admin configuration and invalid limit overrides, retains exact secret comparison, and parses explicit proxy IP/CIDR trust. |
| Database configuration and connection | `backend/src/server.js:4-16` | Validates nonblank `MONGO_URI`, then awaits Mongoose. Feature modules do not connect. |
| Binding and startup failure cleanup | `backend/src/server.js:17-46` | Resolve only on `listening`; callback/event failures reject, close the attempted server, disconnect only when startup observed a disconnected DB, and preserve the original error if cleanup fails. |
| Express composition | `backend/src/app.js` | One security context per app; proxy setting, exact-origin CORS check, CORS headers, JSON parser and redacted parser-error handler, then existing router order. No connection/listening calls. |
| Admin authorization | `backend/security.js:33-43`; blogs/news routes; `backend/src/app.js:33-39` | Shared predicate and unauthorized envelope; verification uses `password`, other admin workflows use `adminPassword`. Shared-secret containment is not session authentication. |
| Limiter construction/lifetime | `backend/security.js:45-71` | Eight limiter instances per app. All relevant features receive those instances; never construct a new admin limiter inside a router. |
| Feature routes and schemas | `backend/src/modules/{contacts,emergencies,blogs,news,auth,chat}/` | Each feature owns `routes.js` and its existing `model.js`; no controller/service layers needed for current handlers. |
| Breach provider integration | `backend/src/modules/breach/routes.js` and `backend/src/modules/breach/provider.js` | Route owns HTTP response mapping and the injected breach limiter; provider owns transport, abort deadline, response validation and explicit failure outcomes. No database model or generic provider framework. |
| Legacy model path | `backend/models/Emergency.js:1` | Forwards to the canonical emergencies model. Keep it while compatibility callers/tests use it. |

Environment validation and database initialization are logically separated: app
construction validates security settings without connecting, and startup validates
the database URI before connecting. They are not separate configuration modules.
`PORT` is passed through with the existing fallback; it has no dedicated validator.
No new validation or coercion is introduced here. Secret rotation requires a new
app/process; backend secrets must remain outside frontend/Vite configuration.

## Current breach-provider boundary

[`provider.js`](../backend/src/modules/breach/provider.js) exports
`lookupBreaches(email)`. [`routes.js`](../backend/src/modules/breach/routes.js)
passes the existing decoded `req.params.email` without adding email validation or
encoding. `GET /api/breach/:email` retains the injected `breachLimit` before the
handler; app composition supplies the existing `security.breachLimit` instance.
There is no database access in this feature.

- **Request and cancellation:** the provider constructs the external request and
  passes an AbortController signal to `fetch`. A 10,000 ms timer aborts that signal
  across both fetching the response and consuming its JSON body; the timer is
  unreferenced where supported. The signal is checked after each await so a
  valid-looking result arriving after timeout cannot become a successful outcome.
  This is an abort deadline, not a separate Promise race that forces arbitrary
  non-cooperative promises to settle at exactly ten seconds.
- **Redirects and HTTP failures:** `redirect: 'error'` rejects redirects rather
  than following them. Only HTTP 2xx responses reach JSON parsing; non-2xx statuses,
  including 404/429/500, fail without consuming the upstream JSON body.
- **Response validation:** JSON must be a non-array object with its own `breaches`
  array. It is rejected if it has an `Error`, `error` or `errors` property, or an
  optional `status` other than `"success"`. The breaches array is flattened one
  level; every resulting entry must be a nonblank string. Original entry text is
  retained, not trimmed or normalized.
- **Outcomes and cleanup:** validated data returns `{ ok: true, breaches }`.
  Caught errors return `{ ok: false, reason: 'timeout' }` when the signal is
  aborted, otherwise `{ ok: false, reason: 'unavailable' }`. Exception details are
  not returned or logged by the provider. Its `finally` block clears the deadline
  timer and aborts the controller on every completed path, including success.
- **HTTP mapping:** the route returns 200 with `{ "safe": true }` for a validated
  empty array, or `{ "safe": false, "breaches": [...] }` for validated entries.
  Timeout outcomes map to 504; other provider failures, including network/JSON/
  shape failures, map to 502. Both use
  `{ "error": "Breach lookup unavailable. Please try again later." }` and log only
  the fixed route message `Breach lookup provider request failed.`. A local limiter
  rejection remains 429 before provider execution; upstream 429 maps to 502.

These statements describe the implementation, not a verified live-provider
contract. Existing provider and HTTP contract tests use mocked upstream calls.
Live availability, real no-breach response semantics, provider accuracy and payload
size bounds remain unverified. A provider error/no-result envelope is not accepted
as evidence of safety; no external lookup or database persistence verification was
performed for this documentation correction.

## Middleware and errors

The security factory mixes pure parsing, credential checks, proxy configuration,
and stateful limiter creation. That is a physical architecture gap, not evidence
of duplicated middleware. Keep a single app-scoped factory until a separately
reviewed extraction can preserve the exact context and limiter identities.

Direct protected blog mutations and news listing/approval/deletion run the shared
admin limiter before `requireAdmin`. Admin verification uses that same limiter and
predicate. News submission first runs the news limiter. Explicit `adminPassword`
then invokes the same admin limiter/guard; invalid credentials cannot save, and
public submissions remain pending regardless of client approval/role flags.

| Limiter | Default per IP | Sharing |
| --- | --- | --- |
| Login / signup | 10 each / 15 minutes | Separate instances, same environment maximum |
| Admin | 60 / 15 minutes | Verification, blog mutations, news admin operations and explicit admin publication |
| Contact / emergency / news submission | 20 each / 15 minutes | Three independent instances |
| Chat writes | 60 / minute | One chat write budget |
| Breach lookup | 10 / minute | One budget across all queried emails |

Existing positive-integer overrides, draft-8 rate-limit headers, JSON 429 bodies,
IP/IPv6 key handling and default proxy distrust remain unchanged. Memory counters
are process-local and reset on restart. A shared store and verified proxy topology
are prerequisites for reliable multi-instance/client-IP enforcement; no hosted
topology was verified. An allowlist is only safe when proxy peers and forwarded
header sanitization are controlled. See `backend/SECURITY-CONTAINMENT.md`.

Handlers deliberately retain endpoint-specific catches and JSON error envelopes.
There is no general global error middleware or custom not-found handler;
otherwise unhandled errors reach Express defaults. Security Hardening Task 1 adds
fixed JSON parser-error responses without exception/body logging; CORS remains
before JSON parsing so allowed-origin parser failures retain headers. Parsing
still precedes route limits. Emergency, blog mutation and breach failure logs use
fixed messages without exception objects. There is no shared structured logger. Replacing these
paths with a common error handler could alter content types, bodies, status codes,
logging and browser-visible behavior. Document and characterize them before a
separate approved change; do not normalize them as structural cleanup.

## Dependencies, duplication and import effects

First-party dependencies flow from compatibility wrapper to server/app, from app
to security/router factories, and from routers to local models/libraries. Literal
relative `require()` edges across all 18 backend source files contain no cycles.
No feature imports app/startup or another feature's routes. This check does not
claim anything about dependency-package internals or hypothetical dynamic imports.

Mongoose is a shared singleton. Importing the emergency router registers its model;
constructing the app registers the other models and creates limiter stores. These
are in-process initialization effects, not DB connections or HTTP listeners.
Other models use `mongoose.models.Name || mongoose.model(...)`; Emergency retains
its original unconditional registration. Normal CommonJS caching avoids repeated
registration, but custom cache clearing/hot reload could require separate review.
Do not introduce cache manipulation or schema changes merely for uniformity.

Repeated `try/catch` blocks preserve different response contracts. News uses the
same admin predicate for both its guard and publication decision; there is no
second authentication implementation. Test HTTP fixtures overlap but differ:
security tests maintain synthetic records/write tracking, while contract tests
reject unexpected persistence and mock only operations relevant to each case.
Combining them now could weaken isolation or conceal unintended calls.

Compatibility paths still needed are `backend/server.js` and
`backend/models/Emergency.js`. `backend/security.js` remains the canonical factory,
not a duplicate or forwarding shim. `package.json` still has legacy
`main: "index.js"` despite CLI startup using `server.js`; package-root imports are
not an established tested contract. Changing package metadata is deferred.

## Tests and target architecture gaps

| Approved target | Actual state | Recommended action |
| --- | --- | --- |
| `backend/src/app.js`, `server.js` | Present with composition/startup separation and compatibility wrapper | Retain boundaries and startup regression gate. |
| `backend/src/modules/` | Seven features extracted; six existing models preserved | Keep current feature ownership; do not add empty layers. |
| `backend/src/config/` | Absent; validation in security factory and startup | Later extract pure validation only if independently useful, preserving validation order, messages, exact secret semantics and wrapper imports. Keep DB connection lifecycle in startup. |
| `backend/src/middleware/` | Absent; security factory owns authorization/limits; app owns parser/CORS | Later relocate the cohesive factory with a compatibility export if needed. Preserve one shared context; review error middleware separately. |
| `backend/src/lib/` | Absent; breach transport/validation lives in feature-local `modules/breach/provider.js` | Retain the explicit feature-local boundary; no shared provider framework or redundant service wrapper is justified. |
| `backend/tests/unit/` | Absent; configuration checks live in `backend/test/security.test.js` | Future pure parsing/predicate tests can live here after a deliberate split. Do not label HTTP/startup tests as unit tests. |
| `backend/tests/integration/` | Absent; two files under `backend/test/` | Existing tests exercise real loopback Express HTTP and mocked DB/provider boundaries; retain locations in this step. |
| `docs/architecture.md` | Added by Step 4A | This ownership/gap record. |
| `docs/api-contracts.md` | Present, includes Step 3C/3D risks | Preserve as response/security compatibility baseline. |
| `docs/deployment.md`, `docs/operations.md` | Absent; some guidance in containment/verification docs | Later consolidate confirmed setup, proxy/store requirements, shutdown, readiness, backups and rollback procedures; do not invent hosted settings. |
| `.github/workflows/ci.yml` | Present, backend-only Windows/Linux jobs | Keep `npm test`. Existing syntax step enumerates app/startup/security/tests but not feature files individually; tests load/parse all features. Consider recursive syntax coverage separately. Hosted execution is unverified. |

The frontend target layout is outside this backend audit; it was not migrated or
built. Existing API URLs and browser contracts remain as documented.

Both test files are integration-heavy. `security.test.js` mixes pure configuration,
HTTP authorization/rate limits, CLI and startup tests; `api-contracts.test.js` has
18 HTTP characterization cases. Total: 29 security/startup cases plus 18 contract
cases = 47. Mongoose persistence/provider calls are mocked; no MongoDB durability,
index enforcement or real provider contract is established by these tests.

A future test split is feasible with the existing Node runner and no dependency
addition, but it must preserve per-file process isolation and per-test mocks.
Moving files one directory deeper requires reviewing app/server imports, CLI cwd,
the frontend inventory path, and explicit CI syntax paths. Do not leave forwarding
test files that execute suites twice. Keep `npm test` discovery, all original
assertions, loopback-only sockets, and the complete startup failure coverage. Split
pure checks first only when approved, then HTTP/startup groups; compare discovered
test names/counts and zero-skip results at each gate. No test files move here.

## Remaining verification and separate security work

Local checks cover all 17 API method/path combinations, original limiter identities
and defaults, model/compatibility identities, startup regressions and absence of
DB/listener/provider/dotenv calls on app import/construction. They do not establish
real MongoDB TLS/indexes/uniqueness/durability, hosted Linux/CI results, actual proxy
topology, multi-instance enforcement, load behavior or frontend/browser behavior.

Startup readiness remains initial-only; runtime DB loss, graceful signal shutdown
and concurrent startup/connection ownership are not covered by current guarantees.
Shared-secret administration, missing server-managed user sessions, public chat
identity, broader input validation, raw logging and broad CORS remain separate
security work in the original Step 4A snapshot. That snapshot's breach error-to-safe
finding was superseded by Step 4B; the current extracted provider rejects failures
as described above. The historical audit itself did not implement that later fix.

Any later migration requires a fresh green 47-test baseline (or its explicitly
expanded successor), preservation of existing work and a reviewed scope. This
audit does not begin another migration or authorize a behavioral change.
