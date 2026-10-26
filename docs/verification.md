# Migration Step 1 verification record

## Preserved baseline

Date: 18 October 2026. Local runtime: Node.js 22.19.0.

Before adding verification files, Git contained modified backend server/manifest/
lockfile plus untracked Phase 2 security helper, environment example, containment
documentation and security tests. No changes were reset, staged or committed.

All 43 tracked and non-ignored working files were copied into a ZIP outside the
repository, alongside a per-file SHA-256 manifest. This includes modified file
contents and untracked Phase 2 files; it is not merely a snapshot of committed HEAD.
Ignored dependencies, actual environment files and `.git` are not included. The
manifest also records HEAD and the initial short Git status.

Local snapshot directory:
`C:\Users\Tushar\.codex\visualizations\2026\10\18\01a14e35-2190-7ae2-a08d-61c2e5719b43`

- Archive: `cyber-sudarshan-step1-a68eb439.zip`
- Manifest: `cyber-sudarshan-step1-a68eb439.json`
- Archive SHA-256: `4E5C03E073872797CB20D0E065723D8015CE8F1CD1E4229D722BAE67A1D34E5D`

Keep the original checkout and artifact. If recovery is needed, first validate the
archive checksum and extract into a separate directory for comparison. Do not
blindly overwrite newer working changes. The ZIP preserves files, not Git history
or an independently recoverable repository; the original Git history remains in
the checkout. No secrets are intended to be stored in the snapshot.

## Verification-only changes

- Added `backend/test/api-contracts.test.js` without changing the existing test
  suite, application code, manifests or lockfiles.
- Added `docs/api-contracts.md` to record the current API and security boundaries.
- Added `.github/workflows/ci.yml` for backend syntax/tests on Windows and Linux.
- Added this record, including limitations and the next authorized migration gate.

## Executed results

| Check | Result |
| --- | --- |
| Unchanged backend `npm test` before edits | 29 passed, 0 failed, 0 skipped |
| Backend `npm test` after adding contract coverage | 38 passed, 0 failed, 0 skipped |
| `node --check` on backend server, security helper, Emergency model and both test files | All five passed |
| `git diff --check` | Passed |
| Whitespace checks on all four new files using `git diff --no-index --check` | Passed |
| Original files compared with pre-edit SHA-256 manifest | All 43 unchanged |
| Snapshot archive and every original file entry checked against SHA-256 | Passed |

Both suites are discovered by the unchanged `node --test` script. Node executes
test files in isolated processes; Mongoose mocks are scoped to each test. No live
database or provider credentials are required. The existing CLI failure test
forces an empty admin secret and cannot reach MongoDB.

## Frontend and CI limits

Frontend scripts are `dev` (Vite), `build` (Vite build), `lint` (ESLint), and
`preview` (Vite preview). Backend dependencies are present; frontend dependencies
are absent. No packages were installed in this step. Frontend lint/build/browser
checks therefore remain unverified, and this workflow is explicitly backend-only.

The workflow was authored but not executed on GitHub in this step. Once run in CI,
it will install the existing locked backend dependencies using
`npm ci --ignore-scripts --no-audit --no-fund`, then check syntax and run `npm test`.
This is a future CI installation, not a local installation or dependency change.
The workflow has read-only repository permission, disables persisted checkout
credentials, receives no production secrets, starts no application deployment,
and provisions no database. Both matrix jobs use Bash with failure propagation.

CI action references use version tags; immutable action pinning and routine action/
runtime update policy remain follow-up hardening. No hosted CI execution, Linux
runtime result, frontend build, real DB durability/index verification, deployment
topology check or external-provider contract verification is claimed here.

## Exact next migration step

Before structural changes, verify this CI on the proposed reviewed baseline and
retain the 38-test gate. Then separate `createApp()` into `backend/src/app.js` and
startup into `backend/src/server.js`, retaining a thin `backend/server.js` wrapper
for the existing start command. Update test imports/CLI references as needed in
that separate step. Keep schemas, route behavior, the security helper, shared
limiter lifetimes, collection identities and frontend files unchanged initially.

Acceptance: all 38 tests remain green, importing the app has no connection/listen
side effects, and occupied-loopback-port failure still preserves its bind error
and cleans up once. Feature extraction and new authentication are not authorized
by Step 1.

## Step 4A backend stabilization record

The preceding Step 1 sections are historical. Steps 2 and 3A-3D have since
extracted startup/composition and all seven features. The current gate is 47
tests, rather than the historical 38-test gate above. See
[backend ownership and architecture gaps](architecture.md) for the Step 4A audit.

Before editing, the full backend `npm test` passed: 47 passed, 0 failed, 0 skipped.
The existing modified and untracked Phase 2/migration files were retained. A
snapshot of all 62 tracked/non-ignored working files and a SHA-256 manifest were
saved outside the repository in the snapshot directory listed above:
`cyber-sudarshan-step4a-03f4dcf1.zip` and `.json`. Actual environment files, ignored
dependencies and Git internals were excluded. No reset, cleanup, stage or commit
was performed.

Step 4A changes documentation only: adds `docs/architecture.md` and appends this
record. Runtime configuration, middleware, tests and scripts remain unchanged;
physical config/middleware/test reorganization is deferred with reasons and a
future compatibility checklist. No package installation, provider request,
database connection or production service access is part of this step.

Verification uses the unchanged complete `npm test` suite, syntax checks across
all backend JavaScript source/test files, tracked and new-file whitespace checks,
and snapshot comparison. A separate in-process probe blocks DB connection,
socket listening, fetch and dotenv calls before app import/construction; verifies
all 17 unique routes, exact shared admin/feature limiter identities and eight
default budgets, model/collection identities and both compatibility exports;
and checks literal relative require edges for cycles across 18 source files.

The full suite includes real occupied-loopback-port EADDRINUSE, callback/event
failure, cleanup-failure/original-error preservation, pre-existing connection
ownership, database-before-listen and exact route inventory regressions. External
providers and persistence remain mocked. CI/Linux, live MongoDB, actual proxy
topology, frontend build/browser behavior and production readiness are unverified.
No further implementation step is started by this audit.

Executed Step 4A results:

| Check | Result |
| --- | --- |
| Baseline `npm test` | 47 passed, 0 failed, 0 skipped; exit 0 |
| Final `npm test` | 47 passed, 0 failed, 0 skipped; exit 0 |
| `node --check` across all backend source/test files | 20 files passed |
| `git diff --check` and separate untracked document checks | Passed |
| Import/construction, route, limiter, model and local dependency probe | Passed; no forbidden side-effect calls, 17 unique routes, 18 source files without literal local-require cycles |
| Comparison against the pre-edit snapshot | 61 existing files unchanged; only this record appended and architecture document added |

The existing tracked wrapper emitted a Git LF-to-CRLF advisory during whitespace
checking; no whitespace error or file conversion occurred.

## Step 4B breach failure correction

The baseline suite passed 47 tests, zero failures or skips, before edits. All 63
existing tracked/non-ignored working files were preserved in an external snapshot
and hash manifest, `cyber-sudarshan-step4b-807a8b42.zip` / `.json`, in the artifact
directory above. No actual environment files or ignored dependencies were copied.

Changes are restricted to the breach handler, its contract tests, and directly
related contract/architecture/containment/verification documentation. Existing
unsafe breach assertions are intentionally corrected: provider error responses
now produce 502, deadline expiry produces 504, and logs omit upstream details.
The decoded outbound URL assertion, success payloads, request counting, no-error-
body parsing and all unrelated tests are retained. Five additional tests cover
valid array variations, malformed/contradictory data, and timeout in request/body
phases, including a valid-looking result arriving after expiry. The expected total
is now 52 tests (29 security/startup, 23 contracts).

The first expanded run passed 50/51: Node's one-time experimental MockTimers
warning was captured by a new exact log-count assertion. The test now flushes
that warning before installing its application-log mock; the assertion remains
exact. The subsequent full `npm test` passed 51, with zero failures or skips,
including real occupied-port, cleanup-failure and connection-ownership tests.
Provider calls remain mocked and test listeners bind only to loopback. Public
provider documentation was consulted; no live provider lookup or production DB
was accessed. No dependencies, deployment settings or unrelated endpoints change.

The 10-second deadline uses Node's existing AbortController and timer APIs, with
mocked time to verify expiry at the boundary for both headers and body consumption.
Tests also assert one abort notification and redacted timeout output. The old
unsafe 404 behavior is deliberately not preserved: the provider's no-result error
envelope is now unavailable, pending any separately agreed translation contract.
No live provider compatibility, browser behavior, hosted CI/Linux or production
readiness is established by this suite. No next step is started.

Final Step 4B verification:

| Check | Result |
| --- | --- |
| Complete backend `npm test` after the late-result regression | 52 passed, 0 failed, 0 skipped; exit 0 |
| `node --check` on breach route and contract test file | Both passed |
| `git diff --check` plus separate checks on all six untracked changed paths | Passed |
| App construction/registration probe | 17 unique routes; breach registered once with the original `security.breachLimit`; zero DB/listener/provider calls |
| Scope and snapshot comparison | Six intended changed files, no additions/deletions; other 57 files unchanged; all non-breach test source unchanged |
| Staged diff | Empty; no staging or commits performed |

## Step 5 frontend API transport

Before editing, backend `npm test` passed 52 tests, zero failures or skips. All 63
existing tracked/non-ignored working files were preserved in an external snapshot
and hash manifest, `cyber-sudarshan-step5-37e099b8.zip` / `.json`, in the artifact
directory above. Existing Phase 2 and migration work is retained; actual environment
files and ignored dependencies are excluded from the snapshot.

The new ESM `frontend/src/lib/api.js` owns base-URL resolution, fetch invocation
and lazy JSON/error handling. Seven components use it through import/function/
origin substitutions only (12 call sites, 14 API combinations). No UI control flow,
backend code, manifests, lockfiles, Vite config or Vercel SPA rewrite changes.
The old deployed origin remains an explicit default for both dev and production;
an explicit invalid override fails rather than falling back. See
[frontend transport](frontend-api.md) for configuration, flow inventory and risks.

`frontend/test/api.test.js` adds ten built-in Node tests with fetch mocked; no
network calls or browser are involved. The first runner invocation was blocked by
sandbox child-process `spawn EPERM`; rerunning with subprocess permission passed
all ten tests, zero failures or skips. `node --check` passed for the transport and
its test file. Node does not compile JSX; source comparison cannot replace Vite
build or browser verification.

Frontend dependencies are absent. `npm run lint` exited 1 (`eslint` not found),
and `npm run build` exited 1 (`vite` not found). No installation was attempted.
Full lint/build/browser verification, real Vite build-time environment substitution,
isolated-backend CORS and hosted routing remain blocked/unverified. Public/backend
secrets were not read, production services were not accessed, and no deployment,
staging, commits or next migration step is included.

Final Step 5 results:

| Check | Result |
| --- | --- |
| Backend baseline and final `npm test` | Both 52 passed, 0 failed, 0 skipped; exit 0 |
| Frontend `node --test test/api.test.js` | 10 passed, 0 failed, 0 skipped; exit 0 |
| `node --check` transport and transport test | Both passed; JSX compilation remains blocked |
| `git diff --check` and separate checks for new/untracked documents/JS | Passed (Git emitted line-ending advisories only) |
| Seven component sources versus preserved snapshot | Exact import/transport/origin substitutions only; 12 sites; all other component source retained |
| Scope comparison | Nine intended original files changed, three added, no deletions; 54 other original files unchanged |
| Remaining frontend source fetch calls | One, inside the shared helper; no other HTTP client calls found |
| Config preservation | Vite, Vercel, all manifests/lockfiles and backend source/tests unchanged; no frontend environment files found |
| Frontend lint/build | Both exited 1 because local eslint/vite are unavailable; no install attempted |

The staged diff is empty. No production requests, deployment or Step 6 occurred.

## Step 5.1 approved dependency recovery and verification

The initial audit found no `frontend/node_modules` and all 20 direct dependencies
unmet (`npm ls --depth=0`, exit 1). Vite and ESLint were declared correctly, not
missing from the manifest. Lockfile v3 root declarations exactly matched the
manifest, and all direct locked versions satisfy declared ranges and Node engines.
The checkout alone cannot establish whether dependencies were never installed or
were removed. Node is v22.19.0; npm is 10.9.3.

The user explicitly approved the proposed installation. From `frontend/`,
`npm ci --include=dev --no-audit --no-fund` completed with exit 0, adding 220 packages
in approximately four minutes. The existing lockfile selected all versions;
framework/dependency upgrades, manifest edits and lockfile regeneration were not
performed. Post-install manifest/lockfile SHA-256 hashes match the preserved
pre-Step-5 inventory. Generated dependencies and build output are Git-ignored.

All existing tracked/modified/untracked work is retained. Before documentation
edits, an external hash inventory of 66 source/documentation files was recorded
as `cyber-sudarshan-step5-1-approved.json` in the artifact directory above. The
only source-tree edits in this step are this appended record and the Step 5.1
status update in `docs/frontend-api.md`.

| Command/check | Result |
| --- | --- |
| `node --version`, `npm --version` | v22.19.0 / 10.9.3 |
| Frontend `npm ls --depth=0` after installation | Exit 0; all direct dependencies present |
| Frontend `npm run lint` | Exit 1; 13 errors, zero warnings |
| Frontend `npm run build` | Exit 0; Vite 7.3.1, 2102 modules transformed; JSX/bundling verified |
| Frontend `node --test test/api.test.js` | Exit 0; 10 passed, 0 failed, 0 skipped |
| Backend `npm test` | Exit 0; 52 passed, 0 failed, 0 skipped |
| `node --check src/lib/api.js` and `node --check test/api.test.js` from frontend | Both exit 0 |
| Frontend `.\node_modules\.bin\eslint.cmd src/lib/api.js test/api.test.js` | Exit 0; no errors/warnings |
| In-memory ESLint comparison with `git show HEAD:frontend/<file>` | All 13 full-project lint findings match the pre-Step-5 committed source by file/rule/severity/message |
| Manifest/lock and source review | Dependencies/configuration/contracts retained; no backend secret references found in frontend source; no frontend environment files present |
| Final whitespace and source-scope checks | Passed; only the two intended documentation files changed, all other 64 files retained, no new/deleted source paths |

The 13 lint errors are 11 unused bindings and two effect-rule findings. Current
locations: Auth 71; Blogs 9/68/113/137; Community 35/46/80; CyberNews 30/35/53;
EmailBreachChecker 29; Home 52. Community 46 and CyberNews 35 are
`react-hooks/set-state-in-effect`; the others are `no-unused-vars`. They are
pre-existing findings, not transport regressions. No lifecycle code is changed
and no lint rule is disabled to force a green verification result.

The production build has a nonfatal outdated-Browserslist-data warning. No update
command was run. There is no configured JSX/component/browser test runner. No
browser test, production request, deployment or hosted environment check was
performed. Alternate Vite environment builds, rendered UI interactions, runtime
CORS and hosted SPA fallback remain unverified. Full lint remains an unresolved
verification gate despite successful dependency recovery and production build.
No files are staged or committed, and Step 6 has not started.
