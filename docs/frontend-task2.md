# Frontend Task 2 verification record

## Scope and baseline

Existing tracked and untracked work was inspected and preserved. A source snapshot
and SHA-256 manifest were saved outside the repository before editing. Comparison
against that snapshot confirms no backend, dependency, deployment, API transport
configuration, or route-definition changes in this task. No packages were installed.

| Check | Before | After |
| --- | --- | --- |
| Frontend `npm run lint` | 0 errors/warnings | 0 errors/warnings |
| Frontend `node --test test/*.test.js` | 23 passed | 34 passed, 0 failed/skipped |
| Frontend `npm run build` | passed | passed |
| Backend `npm test` | 61 passed | 61 passed, 0 failed/skipped |
| `git diff --check` | checked | passed |

Build output retains the existing warning about old Browserslist data. Node tests
also report the existing experimental MockTimers warning. Neither was suppressed.

## Confirmed defects and changes

Before fixes, a real browser reproduced a blank application after malformed
`cyberUser` JSON, an HTTP 500 chat send that cleared its draft with no visible
error, and a news overlay with no dialog role or Escape dismissal.

| File | Change |
| --- | --- |
| `frontend/src/components/Navbar.jsx` | Safe display-identity read; named mobile toggle with expanded state. |
| `frontend/src/components/Community.jsx` | Safe identity read, visible send failures, rollback by optimistic ID, draft recovery, pending-message retention across polling, unmount guards and scroll-timer cleanup. |
| `frontend/src/lib/storedUser.js` | Parse and validate the existing display identity safely, without writing or deleting stored data. This is not authentication. |
| `frontend/src/lib/chatSend.js` | Preserve the chat POST contract, explicitly reject non-2xx responses, and expose small rollback/draft functions for testing. No automatic retries. |
| `frontend/src/lib/dialog.js` | Initial focus, Tab wrapping, Escape, inert background, scroll locking, and cleanup/focus restoration. |
| `frontend/src/hooks/useDialog.js` | Bind that lifecycle to existing conditionally mounted dialogs without resetting focus on every form edit. |
| `frontend/src/hooks/useTimeout.js` | Replace/clear a component's pending timer, and prevent scheduling after unmount. |
| `frontend/src/components/Blogs.jsx` | Apply dialog behavior to admin login, logout and delete; clean up toast timers. |
| `frontend/src/components/Home.jsx` | Apply dialog semantics, focus and keyboard behavior to the emergency form. |
| `frontend/src/components/CyberNews.jsx` | Distinguish loading/failure/empty states, keyboard-enable news cards, apply dialog behavior to submission/details, and clean up toast timers. |
| `frontend/src/lib/apiSubscription.js` | Pass existing response metadata as an additional callback argument so news can detect HTTP failure. Existing data argument and polling/cancellation policy remain intact. |
| `frontend/src/components/Auth.jsx` | Announce existing error and success text through alert/status roles. |
| `frontend/src/components/EmailBreachChecker.jsx` | Name the email field and announce existing results/errors; preserve response handling and text. |
| `frontend/test/reliability.test.js` | Ten tests for storage, chat request/failure/rollback and dialog keyboard/cleanup behavior. |
| `frontend/test/apiSubscription.test.js` | One extra regression distinguishing a failed HTTP response with an array body from a successful empty list. Existing assertions retained. |
| `frontend/test/browser-fixture.mjs` | Loopback-only Vite fixture with synthetic APIs, storage controls and request-cancellation observations. |
| `docs/frontend-task2.md` | This record. |

## Browser execution actually performed

Used the Codex in-app browser against `http://127.0.0.1:5188`. The fixture runs
with the already installed Vite dependency and overrides the API origin only in
its own process. All backend requests were mocked. No live backend, database,
breach provider, account or production credential was used. External presentation
assets are not an offline integration guarantee.

Start the fixture from `frontend` with `node test/browser-fixture.mjs`, then open
`/__fixture`. Its links select synthetic success/failure/delay scenarios and seed
or corrupt only that loopback origin's synthetic member record. This is a reusable
manual/browser-tool fixture, not a new CI E2E test runner.

| Journey | Observed result after changes |
| --- | --- |
| Direct `/`, `/about`, `/services`, `/blogs`, `/login`, `/community` | Expected page content reachable. Community tested with a synthetic member. |
| Desktop About/Services/Blogs navigation; Community back link; mobile navigation | Correct destinations; mobile menu closes on selection. |
| Malformed stored member | Home renders anonymously instead of crashing; storage helper tests verify no deletion/writes. |
| Login/signup | Empty fields fail native validation; invalid credentials and weak signup password show errors; successful mock signup returns to login and successful mock login navigates home and displays member identity. |
| Blogs | Synthetic listing, empty list and HTTP 500 feedback work. |
| Chat | Successful send reconciles to one saved message; HTTP 500 and network failure show an error and restore an empty draft. |
| Delayed chat failure | Optimistic message visible while pending; eventual failure removes it and preserves a newer typed draft. |
| Slow reads and unmount | News loading state visible; client navigation away from delayed news/chat records canceled reads in the fixture. Existing subscription tests verify aborts, stale-result suppression and polling overlap rules. |
| News | HTTP failure has an alert instead of an empty result; Enter opens a news detail dialog. |
| Breach checker | Mock safe and detected results render; HTTP 502 and delayed 504 show the existing generic backend error and re-enable scanning. The 504 scenario is a UI response test, not a live ten-second provider deadline test. |
| News submission dialog | Named dialog, initial close-button focus, Shift+Tab/Tab wrapping, Escape dismissal, opener focus and page-scroll restoration verified. |
| Other dialogs | Admin initial password focus, incorrect-key feedback, Escape and opener restoration; delete/logout Cancel focus and Escape; emergency close/Escape verified. No deletion submitted. |
| Dialog unmount | SPA back navigation with the admin dialog open leaves zero dialogs, zero inert background elements and restored body scrolling. |
| Responsive checks | All six routes checked for document horizontal overflow at 1400x900 and 390x844: none observed. Mobile emergency and chat visually inspected. News form scrolls at 390x568 and keyboard focus reaches its last control. |

Screenshots saved outside the repository:

- `frontend-task2-mobile-dialog.jpg`: mobile emergency dialog at 390x844.
- `frontend-task2-chat-error.jpg`: delayed send failure with a newer draft preserved.

Both are under the task's Codex visualization directory. Browser observations are
not counted as additional Node tests. The dialog unit tests use minimal DOM doubles;
they do not pretend to mount React or replace the browser checks above.

## Final checks and preservation

- Syntax: `node --check` on the four changed/new library files, two hooks, two
  changed/new unit-test files and the fixture (nine JavaScript/MJS files).
- JSX verified by full ESLint and Vite compilation.
- `git diff --check`, plus `git diff --no-index --check -- NUL <file>` on new files.
- Reviewed the diff against the pre-task snapshot as well as Git's existing diff.
  Backend security, startup/ownership tests and pre-existing uncommitted work remain
  intact. No files staged or committed; no deployment performed.

## Remaining risks and verification limits

1. Browser tests use synthetic APIs and Vite development serving. Staging CORS,
   SPA rewrites, real persistence, credentials, production asset loading and the
   built bundle in a browser remain unverified here.
2. Stored member identity and client-supplied chat sender remain untrusted display
   state. This task does not add authentication or server authorization.
3. A network failure can occur after a server saves a chat message. The current API
   has no idempotency key/returned saved message identity; a manual retry can
   duplicate it. An acknowledged server snapshot can briefly overlap a pending
   optimistic record. Full outbox/idempotency behavior needs a separate contract
   decision. When a newer draft exists it is deliberately preserved rather than
   overwritten by a failed send; only an empty draft is restored.
4. Existing read-subscription aborts and timer cleanup are retained/improved.
   In-flight writes are not canceled or retried automatically, because cancellation
   cannot prove they were not persisted. Other form-request deadlines and broader
   cancellation behavior remain separate work.
5. No screen-reader, touch-keyboard, Safari/Firefox, real mobile-device, automated
   accessibility audit or exhaustive visual/zoom testing was performed. DOM roles,
   keyboard behavior and representative Chromium viewport checks passed. The new
   timer hook was reviewed and compiled, not mounted in a dedicated hook test runner.
6. The browser fixture requires explicit execution; there is still no unattended
   browser regression suite in CI. No dependencies were added to introduce one.

These results do not establish production readiness.
