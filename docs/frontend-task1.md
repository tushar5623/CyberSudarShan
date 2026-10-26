# Frontend architecture task 1

## Inspected baseline

The inspected checkout uses React 19, React Router 7, Vite 7 and Tailwind 4 with
ES modules. `App.jsx` declares six routes: `/`, `/about`, `/services`, `/blogs`,
`/login`, `/community`. Pages and reusable UI currently share `src/components/`;
there were no separate page/feature/hook directories. This task moves none of them.
`/services` renders WebPenetrationPage; the separate Services component is not the
route element. Navbar, particle background and Home's composed sections are shared
UI boundaries. API transport is already centralized in `src/lib/api.js`.

Before edits, frontend transport tests passed 10/10, the production build passed,
backend tests passed 61/61, and full ESLint reported 13 errors/zero warnings. The
backend count includes the nine previously added breach-provider unit tests.
All 68 existing tracked/non-ignored files were preserved in an external ZIP/hash
inventory, `cyber-sudarshan-frontend-task1-cdbdabd0`, before implementation.

## Confirmed issues and implementation

- Ten ignored catch bindings were real unused variables. Optional catch bindings
  remove those declarations without changing alerts, toasts or error messages.
- Blogs' eleventh unused binding was a real load-error state that was written but
  never rendered. It now appears as an alert on failure, suppresses the misleading
  empty-list message, and clears on a successful refresh. Successful UI is unchanged.
- Community and news effects directly invoked component functions that mixed
  fetching and state updates, triggering two effect-rule errors. They also lacked
  in-flight read cleanup; chat polls could overlap and complete out of order.
- `lib/apiSubscription.js` now owns the common asynchronous read lifecycle and
  delegates transport/JSON parsing to the existing helper. It starts immediately,
  supports optional 3000ms polling, skips busy polls without cancelling slow reads,
  coalesces explicit refreshes behind pending reads, aborts on unsubscribe and
  prevents late data/error callbacks after cleanup. It contains no React or write
  logic. This boundary serves two existing consumers and is directly unit-testable.
- Chat formerly reused previous state whenever counts or final IDs matched,
  discarding same-length changes and authoritative replacements of optimistic IDs.
  `lib/chatMessages.js` compares every rendered field (`_id`, sender, message,
  timestamp), preserving state identity only when the displayed snapshot matches.
  Backend ordering, sender handling, optimistic append and POST body remain intact.
- Native chat, auth and news controls had missing accessible names. Added labels
  to the chat input/send/mobile-home controls, auth inputs/password toggle, news
  arrows, close controls and submission fields. Password visibility exposes its
  existing state through `aria-pressed`. No styles or form values were redesigned.

The API base URL, build-time environment handling, all route paths, write methods,
headers and serialized payloads are unchanged. Read requests add an AbortSignal
for lifecycle cancellation. News retains its non-array fallback and chat ignores
non-array snapshots. Existing HTTP/body error policies are intentionally retained;
there is no new authentication, credential, session, timeout or write-retry policy.
No ESLint rules or configuration are disabled. No dependencies are added/updated.

## Tests and verification

Run from `frontend/`: `node --test test/*.test.js`, `npm run lint`, `npm run build`.
The suite contains the original 10 transport tests plus eight subscription tests
and five reconciliation tests (23 total). Subscription tests cover immediate reads,
3000ms cadence/non-overlap, queued post-write reads, abort/idempotent cleanup,
late body suppression, failure/recovery, retained HTTP-body policy and simulated
cleanup/re-subscription ordering. All fetch calls are mocked; no production API
is contacted. These are unit tests, not mounted React or browser tests.

The first expanded run exposed a new fixture's inverted request sequencing:
Node's mock call record was inspected before the current invocation was recorded.
An explicit fixture counter corrected it; assertions were not loosened. The
subsequent run passed all 23 tests. MockTimers emits Node's experimental API
warning; it is not an ESLint finding. The baseline build's nonfatal outdated
Browserslist-data warning is retained without dependency updates.

Final executed results:

| Command/check | Before | After |
| --- | --- | --- |
| Frontend `npm run lint` | Exit 1; 13 errors, zero warnings | Exit 0; zero errors/warnings |
| Frontend `node --test test/*.test.js` | Original transport suite 10/10 | 23 passed, zero failures/cancellations/skips; original 10 tests unchanged |
| Frontend `npm run build` | Exit 0; 2102 modules | Exit 0; 2104 modules; JSX/bundling verified |
| Backend `npm test` | 61 passed | 61 passed, zero failures/skips |
| `node --check` on both new utilities and both new test files | Not applicable | All four passed |
| `git diff --check` and separate new-file checks | Not applicable | Passed; line-ending advisories only |
| Snapshot/scope comparison | 68 existing files | Seven intended existing files changed, five added, none deleted; other 61 files unchanged |

The unchanged files include the entire backend, original API transport and its
tests, route declarations, dependency manifests/lockfiles and deployment configs.
The Git staged diff remains empty. Production build output is ignored locally.

## Remaining work, in priority order

1. Browser/integration verification: actual StrictMode mounts, navigation during
   pending requests, slow/offline chat, optimistic reconciliation, scroll position,
   alert rendering, keyboard controls and screen-reader announcements. Unit tests
   establish helper behavior, not complete rendered interactions or accessibility.
2. Existing chat/auth policy: POST status is still ignored by optimistic chat;
   local-storage identity is unverified, and malformed stored JSON can break
   Navbar/Community rendering. Reliable send/error UX and storage normalization
   need an explicit behavior contract; they are not silently redesigned here.
3. Dialog accessibility: news/blog modals lack complete focus trapping/restoration,
   Escape handling and background inertness. Some clickable cards are not keyboard
   controls. The label fixes do not establish full dialog/keyboard accessibility.
4. Remaining asynchronous cleanup: Blogs' separate refresh workflow, toast timers,
   the chat's 100ms scroll timer, and particle initialization need their own
   lifecycle review. This task does not claim to have fixed every effect.
5. Component size: Blogs (~416 baseline lines), CyberNews (~228) and Community
   (~221) mix rendering, modals/forms and state. Feature-local dialog/form
   extraction could help after browser coverage exists. Moving all files into
   page/feature folders or creating generic CRUD/state layers offers little value
   for this focused task and risks styling, focus or state reset regressions.

There is no configured component/browser test runner; none was installed. No
browser test, live integration, production service, deployment or commit is part
of this task. Lint/unit/build success does not establish production readiness.
