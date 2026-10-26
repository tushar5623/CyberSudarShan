# Task 3: integration readiness verification (2026-10-25)

Security Hardening Task 1 subsequently restricts CORS to explicitly configured
origins and redacts parser errors. Its [contract amendments](api-contracts.md)
supersede the historical wildcard-CORS/HTML-error observations in this report.

Task 4 follow-up: the combined frontend command subsequently completed with all
40 tests passing; backend remains 64/64. Genuine MongoDB verification is still
blocked by unavailable isolated infrastructure. See the
[dedicated database verification record](database-persistence-verification.md)
for current evidence and guarded disposable-instance setup instructions. The
Task 3 command/approval history below is retained as originally observed.

## Result and scope

Frontend request shapes are compatible with the inspected backend routes. Actual
Vite-transformed frontend transport and the chat-send helper were exercised against
the real Express app over loopback HTTP. Persistence and upstream provider responses
were mocked; no MongoDB database, live provider, production account or hosted service
was accessed. This is transport/route integration, not database or full browser E2E
integration. No production-readiness claim follows from these results.

The prior working tree contained extensive tracked and untracked security and
migration changes. An external SHA-256 inventory of all 81 existing source files
was saved before edits as `cyber-sudarshan-task3-baseline.json` in the task's Codex
visualization directory. Existing work was preserved; nothing was staged, committed,
pushed or deployed. No dependencies or environment/deployment files were changed.

## Inspected sources and configuration

- Documentation: `api-contracts.md`, `frontend-api.md`, `verification.md`,
  `architecture.md`, Task 1/2 frontend reports, backend containment notes.
- Backend: app composition, startup, compatibility wrapper, shared security helper,
  all feature route handlers, relevant User/News/Chat schemas, contract/security/
  breach-provider tests and package scripts.
- Frontend: API transport, subscriptions and chat helper; Auth, Blogs, CyberNews,
  Community, Home, ContactFooter and EmailBreachChecker call sites; route setup,
  package scripts, Vite config and Vercel rewrite. Existing CI is backend-only.
- Node v22.19.0, npm 10.9.3; installed dependencies support lint/build/tests.

`ADMIN_SECRET` and `MONGO_URI` are required by backend startup. `PORT` defaults to
5000. Optional positive-integer limits: `AUTH_RATE_LIMIT_MAX`,
`ADMIN_RATE_LIMIT_MAX`, `PUBLIC_WRITE_RATE_LIMIT_MAX`, `CHAT_RATE_LIMIT_MAX`,
`BREACH_RATE_LIMIT_MAX`. `TRUSTED_PROXY_CIDRS` is optional; unset means no trusted
proxy. Only CLI startup loads dotenv. This verification never invoked CLI startup
or loaded backend `.env` configuration.

Frontend `VITE_API_BASE_URL` is optional public build-time configuration. Unset
still selects the existing Render backend in both development and production.
For local verification it must be explicitly overridden; do not rely on a Vite
proxy (none is configured). Production requires an HTTPS origin and a rebuild
after changing configuration. No backend secret belongs in a `VITE_*` variable.

CORS currently allows `*`, standard write methods and requested headers, with no
credentialed-cookie policy. That permits the inspected non-cookie JSON workflows;
it is not an origin allowlist or authorization control. Browser access to custom
rate-limit headers is not configured through exposed headers. Existing UI only
needs the HTTP status/body. Actual hosting origins/proxy topology were not checked.

## Frontend-to-backend mapping

| Frontend operation | Actual backend contract | Verification |
| --- | --- | --- |
| ContactFooter submission | `POST /api/contact`, name/email/message, 201 message object | Real HTTP, actual handler/schema validation, mocked save; saved fields checked. |
| Home emergency form | `POST /api/emergency`, name/email/mobile/problem, 201 message object | Same as contact; exact acknowledgement checked. |
| Auth signup/login | `POST /api/auth/signup` and `/login`; success/message/public user | Actual bcrypt and real HTTP; mocked user lookup/save; duplicate, wrong-password, absent-user responses checked. |
| Blogs listing | `GET /api/blogs`, document array | Empty/list/500 exercised through frontend transport. |
| Blog admin login | `POST /api/verify-admin`, password | Correct shared credential succeeds; malformed/missing credentials remain covered by backend security tests. |
| Blog publication/edit/delete | `POST /api/blogs`, `PUT/DELETE /api/blogs/:id`, adminPassword | Actual authorized handlers plus unauthorized creation; unchanged backend security suite covers every protected method. |
| News listing/submission | `GET/POST /api/news`, existing content fields | Pending submission hidden from public read, forged approval ignored, invalid explicit credential cannot write; 500 metadata verified. |
| News admin operations (no current frontend caller) | `POST /api/news/admin`, `PUT /api/news/approve/:id`, `DELETE /api/news/:id` | HTTP unauthorized checks, authenticated pending list/approval/deletion; mocked records checked. No moderation UI added. |
| Community polling/send | `GET/POST /api/chat`, message and unverified sender | Actual frontend send helper, storage arguments, read array, empty-message rejection and 429 checked. Existing polling/cancellation tests retained. |
| EmailBreachChecker | `GET /api/breach/:email`; safe/detected or 502/504 | Real route/provider validation with synthetic upstream responses: safe/detected, HTTP 429/500, invalid envelope, network failure. Existing backend tests cover deadlines and late results. |

All 17 API method/path combinations and six frontend routes remain intact.
Login returns public name/email only: there are no sessions, tokens or verified
chat identities. Local storage and supplied sender/role fields do not authorize
admin operations. The shared admin limiter, proxy distrust, default budgets and
startup readiness/ownership guarantees remain unchanged.

## Confirmed issue fixed

`backend/src/app.js` previously installed `express.json()` before `cors()`.
Malformed JSON and oversized JSON reached Express's parser error response without
`Access-Control-Allow-Origin`, so a cross-origin frontend could not read the
actual 400/413 response. Focused loopback tests reproduced both failures (two
failures and one passing preflight test before the fix).

The only runtime change moves the existing CORS middleware before the unchanged
JSON parser. All three focused tests then passed. Parser statuses and HTML error
bodies are preserved; no response normalization, new authentication or expanded
CORS policy is introduced. Parser errors still precede route rate-limit budgets.

## Commands and actual results

Commands below are relative to the indicated directory.

| Directory / command | Result |
| --- | --- |
| Backend `npm test`, before edits | 61 passed, 0 failed/skipped; approved rerun exit 0. Initial restricted attempt failed to spawn three test workers (`EPERM`). |
| Frontend `node --test test/*.test.js`, before edits | 34 passed, 0 failed/skipped; approved rerun exit 0. Initial restricted attempt failed to spawn four workers (`EPERM`). |
| Frontend `npm run lint`, before and after edits | Exit 0; no findings. |
| Frontend `npm run build` | Restricted attempt failed with esbuild `spawn EPERM`; approved rerun passed, exit 0, Vite 7.3.1 / 2109 modules. Existing old-Browserslist-data warning remains. |
| Backend `node --test test/cors.test.js`, before runtime fix | Exit 1: 1 passed, 2 failed, 0 skipped; missing CORS header on parser failures. |
| Same focused command after fix | Exit 0: 3 passed, 0 failed/skipped. |
| Frontend `node --test test/backend-integration.test.js` | Exit 0: 6 passed, 0 failed/skipped. Actual HTTP, mocked persistence/provider. |
| Backend final `npm test` | Exit 0: 64 passed, 0 failed/skipped, including startup, occupied-port and connection-ownership regressions. |
| Frontend final `node --test test/*.test.js` | Execution approval rejected; command did not run. Expected discovery is 40 tests (34 existing + 6 new), but no completed combined 40-test run is claimed. |
| `node --check` on app.js and both new test files | All passed. |
| Local Vite production preview HTTP probe | All six frontend routes returned HTTP 200 with root element and module script; preview bound only to 127.0.0.1 and was closed. No browser JavaScript executed. |
| `git diff --check`, plus new-file whitespace checks | Passed; Git emits existing LF/CRLF advisories. |

The final lint/syntax check includes an explicit `node:process` import added to the
new integration test after its successful focused run. The combined frontend rerun
was denied rather than silently skipped or circumvented. No test assertions were
weakened. Existing MockTimers experimental warnings remain.

The integration harness uses installed Vite SSR transformation to resolve the
public local backend URL with `configFile:false` and `envFile:false`; it does not
rewrite application source or intercept frontend HTTP responses. Native fetch
performs requests to the actual ephemeral Express port. Only the exact synthetic
upstream lookup is faked; other non-loopback destinations throw. Mongoose connect
and createConnection throw if called. Model saves validate actual Mongoose
documents, then store synthetic records in test memory. This does not test MongoDB
queries, indexes, concurrency or durability. Test listeners/Vite instances close
and environment overrides restore through test cleanup. Both frontend and backend
dependencies must be installed to run this cross-project test.

## Infrastructure blockers and reproducible next verification

`Get-Command mongod,mongosh,docker` found none on PATH. `netstat -ano` showed no
listener on port 27017. Only `backend/.env.example` was found among repository
environment files; no explicitly isolated database was provisioned. This does not
prove MongoDB cannot exist elsewhere, but it prevents a verified-safe real-database
run with the supplied setup. No attempt was made to use an unverified remote URI.

Repeat the non-database checks after execution approval is available:

```powershell
Set-Location E:\CyberSudarShan\frontend
node --test test/backend-integration.test.js
node --test test/*.test.js
npm run lint
npm run build
Set-Location E:\CyberSudarShan\backend
npm test
Set-Location E:\CyberSudarShan
git diff --check
```

For a subsequent real browser/database smoke test, first provision a dedicated
local MongoDB instance and an empty test-only database. Once that exists, the
following explicit startup avoids dotenv and any inherited production URI. It
was **not executed** here. Use a dedicated terminal and stop it after testing;
the example database must not contain valuable records. There is no automatic
drop/cleanup command.

```powershell
Set-Location E:\CyberSudarShan\backend
node -e "require('./src/server').startServer({host:'127.0.0.1',env:{ADMIN_SECRET:'local-integration-only',MONGO_URI:'mongodb://127.0.0.1:27017/cyber_sudarshan_integration',PORT:'5000',CORS_ALLOWED_ORIGINS:'http://127.0.0.1:5173,http://localhost:5173'}}).catch(()=>{console.error('Local test backend startup failed');process.exitCode=1})"
```

In a second dedicated terminal, configure the frontend before starting Vite:

```powershell
Set-Location E:\CyberSudarShan\frontend
$env:VITE_API_BASE_URL = 'http://127.0.0.1:5000'
npm run dev -- --host 127.0.0.1
# After stopping Vite, remove only this terminal's temporary override:
Remove-Item Env:VITE_API_BASE_URL
```

Use synthetic accounts/data in the browser at `http://127.0.0.1:5173` (check Vite's
printed port). Verify signup/login, duplicate login errors, both forms, pending
news/public filtering, blog admin mutations and chat across two tabs. The sample
admin value is test-only, never a default in application code. Do not perform
breach lookups through this real startup without separately mocking the provider;
that endpoint normally calls an external service. Existing isolated tests cover it.

## Remaining risks and recommended next task

1. Complete the denied combined frontend test run, then provision isolated MongoDB
   and verify actual persistence/indexes plus browser-to-backend CORS behavior.
   That is the next recommended task before further architecture work.
2. The new checks do not mount React or run the built bundle in a browser. Task 2
   browser results were API-mocked; this task's production preview verifies HTML
   fallback only. Hosted Vercel rewrite execution, real build-time hosting values,
   TLS, proxy trust and external provider compatibility remain unverified.
3. Broad CORS, public chat identity, account enumeration, oldest-100 chat ordering,
   ambiguous network writes and missing full input validation remain existing
   design risks, not fixed or authorized as redesigns here.
4. The fail-closed breach integration deliberately rejects the provider's historical
   no-result error envelope. Real no-breach compatibility still needs a separately
   verified provider contract; no external lookup was performed.
5. Generic parser HTML errors still cannot be parsed as JSON by JSON-dependent UI
   callers; they retain existing generic error handling. No global error-envelope
   change was made. Local preview fallback does not prove hosted SPA routing.
6. CI currently installs/runs backend dependencies/tests only. The cross-project
   integration tests need both dependency trees; frontend CI remains future work.

## Changed files

- `backend/src/app.js`: one middleware-order correction and explanatory comment.
- `backend/test/cors.test.js`: three parser/preflight regression tests.
- `frontend/test/backend-integration.test.js`: six Vite/Express transport tests.
- `docs/architecture.md`: correct current middleware ownership/order and logging note.
- `docs/frontend-api.md`: distinguish historical Step 5 observations from current reports.
- `docs/integration-readiness.md`: mapping, evidence, blockers and repeatable commands.
