# Frontend API transport (Step 5)

This Step 5 record is historical. Tasks 1/2 subsequently corrected polling,
optimistic send failures and news error/loading feedback; see
[Task 2](frontend-task2.md). [Task 3](integration-readiness.md) records actual
frontend-transport-to-Express HTTP verification, current results, local startup
commands, and the remaining real-database integration blocker.

## Configuration and transport ownership

`frontend/src/lib/api.js` is the only frontend source file that performs backend
fetches. Components import `apiRequest` and supply backend-relative `/api/...`
paths and their existing RequestInit options. No components, pages or routes move.

Before Step 5, every backend request embedded
`https://cyber-sudarshan-backend-1.onrender.com`. Vite has no development proxy, so
both development and production builds used that deployed backend. The helper
retains that explicit default in both modes; missing configuration does not
silently select localhost or the SPA origin.

An optional public build-time `VITE_API_BASE_URL` can select another backend
origin. For isolated local development, explicitly configure for example
`http://127.0.0.1:5000`; do not run local write checks against the deployed default.
No environment file or hosting setting is changed in this step. An explicit
blank/invalid value fails at module initialization rather than using a fallback.
Values must be absolute HTTP(S) origins, optionally ending in `/`, without user
credentials, path prefixes, query strings or fragments. Production requires HTTPS.
The validation error names the variable without echoing the configured value.

Vite substitutes public environment values into the bundle. Changing a deployed
value requires a rebuild; this is not runtime server configuration. Never place
`ADMIN_SECRET`, `MONGO_URI`, provider credentials or other secrets in `VITE_*`.
Existing user-entered login/admin fields remain in their original request bodies;
the transport adds no stored credential, role, session, cookie or token handling.
Hosted environment values were not accessed or verified.

`frontend/vercel.json` retains its catch-all `/index.html` rewrite. API requests
use the configured absolute backend origin and do not depend on Vercel proxying
`/api`. The Vite config, Vercel config, manifests and lockfiles are unchanged.

## Response and error policy

`apiRequest(path, options)` forwards method, headers, serialized body, signals and
other fetch options unchanged. It adds no JSON defaults, credentials, retries,
polling, timeout, cancellation or logging policy. Dynamic path text, including the
existing unencoded email and record IDs, is not reinterpreted or encoded here.

It resolves a response-style result with `ok`, `status`, `headers`, `error` and
`json()`. A non-2xx response has `ok: false` and an Error carrying `status`; it is
never marked successful by the helper. HTTP errors deliberately do not throw
automatically: components retain their existing status/body decisions, including
the inconsistencies listed below. Network errors reject unchanged.

JSON parsing is centralized but lazy. `json()` reads and parses once, retaining
successful and error bodies exactly; a parsed HTTP error body is also available
as `result.error.body`. Syntax/body-read errors reject unchanged. Status-only and
ignored-response callers never parse bodies, so malformed/absent response bodies
do not newly change their error branches. Empty 204/205 responses parse as `null`
when requested; an empty 200 or non-JSON body still rejects like existing
`Response.json()`. No current backend endpoint relies on a 204/205 response.
This is the subset of the fetch response interface used by existing callers,
not a general replacement for every native Response method.

## Migrated inventory and preserved UI policy

There are 12 fetch sites across seven components, covering 14 API method/path
combinations. Login/signup and blog create/update each share one conditional site.
All component edits are restricted to one import, transport function replacement
and removing the previously embedded origin. Their remaining source is unchanged.

| Component | Existing calls | Preserved behavior |
| --- | --- | --- |
| `ContactFooter.jsx` | `POST /api/contact` | Existing fields/header/body; status-only success alert/reset; separate server/network alerts; submission flag cleared as before. |
| `Home.jsx` | `POST /api/emergency` | Existing name/email/mobile/problem body; status-only alerts; close/reset only on success; same submission flag. |
| `Auth.jsx` | `POST /api/auth/login`, `POST /api/auth/signup` | JSON `success`/`message` policy; password strength check, signup reset/toggle, local storage and login navigation unchanged. |
| `Blogs.jsx` | `GET/POST /api/blogs`, `PUT/DELETE /api/blogs/:id`, `POST /api/verify-admin` | Existing HTTP guards for reads/mutations, JSON admin verification, credential field names, toasts, modals, loading and resets unchanged. |
| `CyberNews.jsx` | `GET/POST /api/news` | Existing array fallback for reads and status-only submission policy; verification toast, form reset/close and loading unchanged. |
| `Community.jsx` | `GET/POST /api/chat` | Existing local-storage display gate, optimistic append/input clearing, 100ms scroll, 3000ms polling, interval cleanup, post-send refresh and logging unchanged. |
| `EmailBreachChecker.jsx` | `GET /api/breach/:email` | Only HTTP-success bodies drive safe/breached rendering; non-success still displays backend error, network/JSON failures still use the existing catch message; same loading/reset behavior. |

The current frontend has no callers for `POST /api/news/admin`,
`PUT /api/news/approve/:id` or `DELETE /api/news/:id`. No moderation UI is invented
in this step. Those backend contracts and authorization remain covered by the
unchanged backend suite.

No direct backend fetch remains outside the helper. External avatar image URLs
in `About.jsx` are browser image resources, not backend requests, and are excluded.
Documentation links and SVG namespace URLs are also not API callers.

## Existing inconsistencies and verification limits

- Auth/admin verification inspect JSON `success` rather than HTTP `ok`. Current
  backend failure bodies use `success: false`, but the UI policy is not normalized.
- News reads turn parsed non-array data into an empty list. Chat reads ignore
  non-array data; blog reads explicitly reject non-success HTTP status.
- Chat submission ignores status/body, keeps its optimistic message and refreshes
  even on an HTTP error. It is not made reliable or authenticated by this helper.
- Local storage is not server authentication, and sender identities remain
  unverified. Polling can overlap, in-flight requests are not aborted on unmount,
  and existing optimistic reconciliation/scroll timers are unchanged.
- A malformed JSON response can still reach a UI's generic network-error message.
  Existing messages, including generic breach-provider errors, are not redesigned.

Ten dependency-free Node transport tests run from `frontend/` with
`node --test test/api.test.js`. They use mocked fetch only: default/override URL
validation, forwarding, lazy parsing, preserved JSON/status/headers, no-content
responses, rejected malformed/network/body reads and no retries. They do not
render React or execute the Vite transform. Snapshot/source comparison verifies
the narrow component substitutions and preservation of the remaining UI source.

At Step 5, frontend `node_modules` was absent. `npm run lint` failed because
`eslint` was unavailable, and `npm run build` failed because `vite` was unavailable.
No packages were installed in that step. JSX compilation, full ESLint checks,
Vite environment substitution, browser flows, CORS against an isolated backend
and hosted SPA routing remained blocked/unverified. The recovery record below
supersedes those installation/build limitations; no deployment or Step 6 occurs.

## Step 5.1 verification recovery

After explicit approval, `npm ci --include=dev --no-audit --no-fund` restored 220
packages from the existing lockfile. Node 22.19.0 / npm 10.9.3 satisfy the inspected
requirements. All 20 direct locked dependency versions satisfy manifest ranges;
post-install `npm ls --depth=0` passes. The manifest and lockfile hashes match the
pre-Step-5 snapshot. No dependency versions or framework configuration changed.

The production `npm run build` passes with Vite 7.3.1 (2102 modules transformed),
establishing JSX compilation and bundling. A nonfatal warning reports outdated
Browserslist data; it was not updated under the no-upgrade constraint. Frontend
transport tests remain 10/10 and backend tests 52/52, with zero failures/skips.
Both transport JavaScript files pass `node --check` and targeted ESLint.

Full `npm run lint` now runs but exits 1 for 13 existing errors:
11 unused bindings and two `react-hooks/set-state-in-effect` findings in
`Community.jsx:46` and `CyberNews.jsx:35`. In-memory ESLint comparison against
committed pre-Step-5 source produces identical file/rule/severity/message
findings. The new transport and tests introduce no lint findings. Existing effect
and error-handling code remains unchanged; full-project lint is not claimed green.

No JSX component-test or browser-test runner is configured. No browser test was
executed, and bundling is not browser verification. Rendered workflows, runtime
CORS, hosted environment settings, alternate Vite configuration builds and SPA
hosting behavior remain unverified. The frontend's default backend is deployed;
no page was opened or API request made to it during these checks. Ignored
`frontend/node_modules/` and production `frontend/dist/` are local generated outputs,
not source changes or a deployment. Step 6 has not begun.

## Subsequent frontend architecture task 1

The historical Step 5/5.1 policy inventory above is supplemented by
[the targeted improvement record](frontend-task1.md). News/chat reads now use a
tested lifecycle subscription over the existing transport; chat retains its
3000ms interval while avoiding overlap and discarding callbacks after cleanup.
Explicit post-write refreshes queue a fresh read after any older snapshot. Chat
reconciliation now accepts changed records even at the same count. Existing write
contracts, transport configuration and authentication semantics remain unchanged.
Blogs now displays its existing load-error state. The 13 prior lint errors are
addressed without suppressions; the new frontend tests run with
`node --test test/*.test.js`. Full browser verification remains outstanding.
