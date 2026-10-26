# Security Hardening Task 1

## Scope, findings and evidence

Inspected current auth/password handling, blog/news authorization, chat identity,
app middleware, CORS, limiter/proxy configuration, all error logging sites, startup,
models, frontend credential/identity use, contracts and installed test conventions.
The pre-edit baseline passed 64 backend and 40 frontend tests. Existing uncommitted
work was preserved in an external 85-file SHA-256 inventory,
`cyber-sudarshan-security1-baseline.json`, in the task's Codex visualization folder.
No database or production service was accessed; no packages were added/updated.

Severity labels are qualitative impact assessments, not independently scored CVSS.

| Priority | Confirmed finding | Evidence and outcome |
| --- | --- | --- |
| High, product decision outstanding | Chat membership/attribution is unverified | Chat GET/POST remain public (`src/modules/chat/routes.js`); frontend `cyberUser` and sender are client-controlled. There are no chat edit/delete/ownership-protected operations to retrofit. No admin bypass was found. Public anonymous chat versus authenticated membership requires an explicit identity/session decision; not claimed fixed. |
| High, sensitive-data risk fixed on identified paths | Exception logging/default parser responses can disclose request details | `src/modules/emergencies/routes.js:18` and `blogs/routes.js:46,61` logged exception objects; default parser errors could include request fragments and stacks. These paths now emit fixed messages or redacted parser JSON. Synthetic error objects containing private markers are excluded by exact log-argument assertions. No claim about hosting/proxy logs is made. |
| Medium, fixed | MongoDB selector injection in account lookup | `src/modules/auth/routes.js:7-12,19-21,45-47`: email objects previously reached `User.findOne({email})`. An offline Mongoose query-casting probe confirmed `$ne` remained an operator. A pre-fix HTTP test selected a synthetic account when its password comparison was mocked successful; this is **not** a claim of bypassing bcrypt or real-DB authentication. Scalar checks now reject operator objects/arrays before lookup or bcrypt. |
| Medium, fixed with required configuration | Any origin could read/call browser-facing APIs through wildcard CORS | `backend/security.js:28-42` validates exact origins; `src/app.js:19-26` rejects unlisted Origin headers before parser/handlers and echoes only allowed origins. No wildcard/default deployed frontend origin is guessed. CORS is browser policy, not authentication. |
| Medium, decision outstanding | Long-password ambiguity in bcrypt | An offline installed-bcrypt probe with two synthetic passwords differing only after 72 bytes returned a successful comparison. A new maximum/prehash/hash migration affects password compatibility and reset policy; unchanged pending an agreed policy. |
| Medium, existing gaps | Account enumeration and distributed abuse | Unknown-user/wrong-password/duplicate-account responses differ. IP-only limits are process-local. Uniform auth errors, account-level controls, a shared limiter store and verified proxy topology need separate compatibility/infrastructure decisions. |

## Exact fixes and compatibility

### Authentication input boundary

Require a non-array object, nonblank string email and nonempty string password;
signup additionally requires a nonblank string name. Malformed shapes/types return
400 with `{success:false,message:"Invalid login data."}` or `"Invalid signup data."`.
The JSON parser can reject non-object JSON even earlier with a redacted 400.
These changes prevent query-operator objects and unintended coercion. Scalar
values are used unchanged: no trimming/case normalization, new password policy,
hash change, account migration, token, cookie or session was introduced.

Rate limiters still run before auth input checks; invalid attempts consume the
same independent signup/login budgets. Successful, duplicate-account, missing-user
and incorrect-password contracts remain unchanged. Existing bcrypt cost 10 and
legacy hash compatibility regressions pass. This is not full authentication/session
hardening; there is still no server-issued authenticated identity for later requests.

### Exact-origin CORS

Set backend-only `CORS_ALLOWED_ORIGINS` to comma-separated canonical HTTP(S)
origins, for example `http://127.0.0.1:5173,http://localhost:5173` locally. No
trailing slash/path, wildcard, `null`, credentials, query or fragment is accepted.
Matching is exact, including scheme/port; suffix lookalikes are rejected. Local
HTTP origins remain supported. Operators must use HTTPS for deployed frontends
and provide actual verified deployment origins rather than copying a guessed URL.

Without configuration outside production, the allowlist is empty and all requests
with an Origin header return 403. With `NODE_ENV=production`, missing configuration
fails app/startup construction before DB connection/listening. Explicit blank or
malformed configuration fails in every environment; error text never echoes the
supplied value. Originless clients remain supported, preserving native/server-
to-server API workflows. Such clients can forge/omit Origin, so this is not an
authorization boundary or substitute for public-endpoint abuse controls.

Denied origins return `{success:false,error:"Forbidden",message:"Origin not allowed."}`
without an allow-origin header, before any route write. Allowed responses and
preflights echo the origin with `Vary: Origin`. No cookies/credentialed CORS policy
or exposed custom headers were added. Existing methods, JSON content-type support
and parser-before-route-limit behavior remain. Browser clients **must** configure
their origin before this change is deployed or local startup is used.

### Error redaction

Parser failures deliberately change from Express default HTML to fixed JSON:

- 400/415: `{success:false,error:"Invalid request body.",message:"Invalid request body."}`.
- 413: `{success:false,error:"Request body too large.",message:"Request body too large."}`.

Statuses and the existing JSON size limit are preserved. No request fragment,
password, expected secret, exception message, stack or headers are returned/logged
by the new parser-error boundary. Emergency/blog persistence errors retain their
existing JSON/status contracts and now log exactly `Emergency persistence failed.`,
`Blog update failed.` or `Blog deletion failed.` without an exception object.
Existing breach redaction and deadline/abort behavior are unchanged. This is a
narrow parser boundary, not a broad replacement for every error handler.

### Preserved security guarantees

All blog/news protected operations retain backend `requireAdmin`/`isAdmin` checks,
constant-length digest comparisons, malformed credential rejection and the shared
admin limiter instance. Public news remains pending; forged status/role and invalid
explicit publication credentials cannot write an approved item. No identity from
local storage or submitted sender is treated as trusted server authorization.

Limiter budgets remain login/signup 10 each per 15 minutes, shared admin 60 per
15 minutes, contact/emergency/news 20 each per 15 minutes, chat 60/minute and breach
10/minute. Proxy distrust, explicit IP/CIDR configuration and IPv6 normalization
remain unchanged. Existing forwarding-header bypass tests pass. No shared store,
new global limiter or per-admin-route budget fragmentation was introduced.

Startup lifecycle is untouched: validated configuration, DB readiness before bind,
actual listening-event resolution, occupied-port rejection and owned-connection
cleanup/original-error preservation remain covered. All 17 API method/path pairs,
six frontend routes, schemas/collections and valid successful response contracts
remain unchanged. Only invalid-input, CORS and parser-error contracts change as
documented above.

## Changed files

| File | Reason |
| --- | --- |
| `backend/security.js` | Validate exact-origin allowlist; require it in production; expose it through the existing security context. |
| `backend/src/app.js` | Reject unlisted origins, configure CORS and redact parser errors. |
| `backend/src/modules/auth/routes.js` | Reject malformed/query-operator fields before account lookup and password work. |
| `backend/src/modules/blogs/routes.js` | Replace two exception-object logs with fixed messages. |
| `backend/src/modules/emergencies/routes.js` | Replace exception-object logging with a fixed message. |
| `backend/.env.example` | Document CORS variable and local example without a working secret or guessed hosted origin. |
| `backend/test/hardening.test.js` | Eight new isolated regression tests. |
| `backend/test/cors.test.js` | Explicit allowlisted fixture origin and exact redacted parser-response assertions. |
| `backend/test/api-contracts.test.js` | Send a configured fixture Origin and retain success/429 CORS assertions under the intentional new policy. |
| `frontend/test/backend-integration.test.js` | Supply/assert the exact frontend fixture origin; existing six flow assertions retained. |
| `backend/SECURITY-CONTAINMENT.md`, `docs/api-contracts.md`, `docs/architecture.md` | Document current policy/error contracts and ownership. |
| `docs/database-persistence-verification.md`, `docs/integration-readiness.md` | Keep local startup examples compatible by explicitly supplying local CORS origins; preserve historical verification records. |
| `docs/security-hardening-1.md` | This evidence/report. |

No frontend product source, route, dependency, actual environment or deployment
setting changed. The original 29 Phase 2 tests and unrelated contract assertions
were retained. CORS wildcard/HTML assertions were intentionally replaced with
stronger exact-origin/redacted-JSON assertions to test the documented security
correction, not skipped or weakened to conceal a failure.

## Regression evidence and command results

Eight added tests cover: operator-valued login lookup; malformed auth shapes with
zero query/hash/compare/save calls; exact/suffix/scheme/null-origin handling and no
unauthorized write; invalid auth sharing existing per-endpoint budgets; allowed/
denied preflights; missing/invalid config and fail-before-connect production startup;
parser redaction with no logs; emergency/blog exact log messages and preserved 500s.

The initial seven pre-fix tests failed as expected. Their DELETE fixture initially
lacked an explicit Content-Length; that test transport was corrected so the JSON
credential body is sent, without weakening its assertions. The focused post-fix
run passed 10 tests (seven hardening plus three CORS). Full backend verification
then exposed one old wildcard assertion: 70/71 passed. A concise diagnostic rerun
confirmed that same failure. Configuring the contract fixture Origin and updating
the exact-origin assertions resolved it; an eighth hardening test verifies invalid
auth attempts still exhaust existing budgets.

| Command/check | Before | Final |
| --- | --- | --- |
| Backend `npm test` | 64 passed, 0 failed/skipped | 72 passed, 0 failed/skipped |
| Frontend `node --test test/*.test.js` | 40 passed, 0 failed/skipped | 40 passed, 0 failed/skipped |
| Frontend `npm run lint` | Prior clean baseline | Exit 0; 0 errors/warnings |
| Frontend `npm run build` | Prior passing baseline | Exit 0; Vite 7.3.1, 2109 modules |
| `node --check` across backend and frontend plain JS/MJS helpers/tests | Existing files inspected | 38 files passed; JSX checked by lint/build |
| `git diff --check` plus separate new-file checks | Existing working tree retained | Passed; LF/CRLF advisories only |

Existing Browserslist-data and MockTimers experimental warnings remain. No registry
advisory audit or dependency-risk clearance is claimed. A Windows glob/read helper
and one patch-context match initially failed; corrected reads/patches completed.
No test was skipped and no command was denied. The final report records actual
test results; automated results alone do not establish production readiness.

Tests use real loopback Express HTTP with isolated synthetic configuration and
mocked/forbidden persistence and provider calls. No database connection or mutation,
production credential access, external lookup, deployment, staging, commit or push
was performed. Existing app-import/startup, occupied-port, cleanup-failure and
connection-ownership regressions pass. No new browser execution occurred here.

## Required operator actions and remaining decisions

1. Before any deployment, set and verify `CORS_ALLOWED_ORIGINS` for the real frontend
   origin(s), including actual local ports when developing. Confirm allowed and
   denied browser preflights, CORS-aware error rendering and CDN `Vary: Origin`
   handling in a controlled environment. No hosting setting was changed here.
2. Decide whether chat is public/anonymous or requires server-managed identity.
   The latter needs a separately scoped session/account design, login migration
   and ownership/moderation policy. CORS cannot solve chat impersonation.
3. Agree on bcrypt long-password handling before changing accepted passwords:
   reject new values above 72 UTF-8 bytes with matching UI feedback, or introduce a
   versioned hashing/migration/reset strategy. Existing hashes cannot reveal whether
   an original password exceeded the effective limit; do not silently change login.
4. Account enumeration responses, account-level controls, comprehensive length/
   content validation for public submissions, logging/retention and abuse moderation
   need separately agreed contracts/policies. Raw client objects cannot now enter
   auth email selectors, but this is not universal input validation.
5. Real MongoDB persistence/index behavior remains intentionally deferred. Verify
   in a dedicated disposable database when authorized; no database was used here.
   Multi-instance rate enforcement requires a shared store and confirmed proxy
   topology. TLS, production secrets, proxy/application access logs, hosted CORS,
   provider compatibility and frontend browser flows require separate live checks.
