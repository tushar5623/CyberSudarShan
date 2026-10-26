# Task 4: dedicated database and persistence verification

## Outcome (2026-10-25)

**Genuine MongoDB persistence verification did not run.** No isolated disposable
database was available or established. No database connection, creation, mutation,
reset, collection/database drop or record deletion was performed. No persistence
defect was confirmed and no application or test implementation was changed.

The previously incomplete combined frontend command now completed successfully:
**40 passed, zero failures, zero skips**, including all six frontend-to-Express
tests. These tests still mock persistence and external provider responses. They
must not be described as real database integration.

## Inspected setup and exact infrastructure blocker

Inspected backend startup/environment loading, compatibility wrapper, package
scripts, shared configuration example, all six persistence models, relevant route
operations, API contracts, Task 3 integration report, existing backend tests,
frontend integration harness and CI configuration.

- Node v22.19.0 / npm 10.9.3; both dependency trees already installed.
- `Get-Command mongod,mongosh,docker -ErrorAction SilentlyContinue`: no matches.
- MongoDB/Docker service and process queries: no matches.
- The conventional `C:\Program Files\MongoDB\Server` and
  `C:\Program Files\Docker\Docker` locations were absent.
- `netstat -ano` filtered for port 27017: no matching listener/connection.
- No explicitly named test MongoDB environment configuration was found; only
  environment-variable **names**, not values, were inspected for that check.
- Repository environment-file inventory found only `backend/.env.example`.
  No secret environment values, remote connection strings or production services
  were used. This is not a claim that MongoDB cannot exist at another location.

There is no existing real-database test runner or database provisioning script in
this checkout. `backend`'s `npm test` runs `node --test`; its existing persistence
calls are mocked. Frontend integration tests use real loopback Express HTTP and
actual bcrypt/Mongoose validation but explicitly forbid MongoDB connections.
Existing CI provisions no database and runs only the backend suite.

Only `runCli()` loads dotenv. Programmatic startup accepts an explicit `env` object
and requires nonblank `ADMIN_SECRET` and `MONGO_URI`. It connects before listening;
the startup/occupied-port/cleanup/connection-ownership tests remain intact. None
of the application's real database startup paths were invoked in this task.

## Model and contract evidence

An offline `createApp()`/Mongoose model inspection confirmed these collection
identities and declared indexes with connection state remaining disconnected.
These are schema declarations, **not verified physical database indexes**.

| Model / collection | Real-database checks still required |
| --- | --- |
| User / `users` | `POST /api/auth/signup` returns 201; one stored account with bcrypt hash rather than plaintext; duplicate sequential signup returns 400; `POST /api/auth/login` accepts that stored account. Email has a declared unique index: inspect its physical presence before testing duplicate-key enforcement. |
| Blog / `blogs` | Authorized `POST /api/blogs` persists title/author/content/date; public GET retrieves the same `_id`; authorized PUT persists edits and DELETE removes only that test post. |
| News / `news` | Public POST persists pending despite a supplied approved flag; public GET hides it; authenticated admin list sees it; authenticated approval persists approved status and makes it public; authorized DELETE removes only that test record. Invalid credentials must not write. |
| Chat / `chats` | POST persists sender/message/server timestamp; GET retrieves it. Existing ascending sort/limit returns the oldest 100; use a fresh database so test data is not outside the window. Sender remains an unverified label. |
| Contact / `contacts` | POST returns 201 with `Data Saved to Cloud!`; inspect the database for matching name/email/message and date. There is no contact-read/delete API to invent for this check. |
| Emergency / `emergencies` | POST returns 201 with the existing emergency acknowledgement; inspect name/email/mobile/problem/date directly in the database. There is no emergency-read/delete API. |

Only User declares an application index (`email`, unique). All models retain their
existing schemas, identities and field names. Exact methods/bodies/errors are in
[API contracts](api-contracts.md). Concurrent signup/unique-index enforcement,
durability across reconnect/restart, real query sorting and cleanup are unverified.

## Safe reproducible provisioning instructions — not executed

An operator must first supply an approved MongoDB Community Server installation
or another explicitly disposable local instance. Nothing is downloaded, installed
or started by this document. Do not substitute an existing `MONGO_URI`, cloud
cluster, production credential, reused database directory or valuable database.

The following Windows PowerShell setup creates a **new unique data directory** for
a dedicated server on a separate loopback port. It deliberately fails if `mongod`
is missing, the port is listening, or the directory already exists. Run it only
after MongoDB is available. It leaves the server in the foreground.

```powershell
$mongoExecutable = Get-Command mongod -ErrorAction Stop
if (Get-NetTCPConnection -State Listen -LocalPort 37017 -ErrorAction SilentlyContinue) {
    throw 'Port 37017 is occupied; do not reuse that instance.'
}
$runToken = [guid]::NewGuid().ToString('N')
$testDataDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('cyber-sudarshan-disposable-' + $runToken)
if (Test-Path -LiteralPath $testDataDirectory) { throw 'Refusing an existing data directory.' }
New-Item -ItemType Directory -Path $testDataDirectory -ErrorAction Stop
Write-Output ('Dedicated disposable directory: ' + $testDataDirectory)
& $mongoExecutable.Source --bind_ip 127.0.0.1 --port 37017 --dbpath $testDataDirectory
```

If binding fails, stop; do not connect to the process occupying that port. After
successful startup, verify the running process command line matches this new
directory and loopback port. That fresh server/directory is what establishes
disposability; a database name beginning with `test` alone does not establish it.
Do not expose this unauthenticated local test instance beyond loopback.

In a second dedicated terminal, create a fresh test database name and explicitly
start the backend. This avoids dotenv and any inherited application `MONGO_URI`.
The synthetic admin value below is for this local disposable instance only; it is
not an application default. The startup process stays in the foreground.

```powershell
Set-Location E:\CyberSudarShan\backend
$env:CYBER_TEST_DB_NAME = 'cyber_sudarshan_test_' + [guid]::NewGuid().ToString('N')
Write-Output ('Disposable test database: ' + $env:CYBER_TEST_DB_NAME)
node -e "const name=process.env.CYBER_TEST_DB_NAME;if(!/^cyber_sudarshan_test_[0-9a-f]{32}$/.test(name||''))throw Error('Invalid test database name');require('./src/server').startServer({host:'127.0.0.1',env:{ADMIN_SECRET:'task4-local-test-only',MONGO_URI:'mongodb://127.0.0.1:37017/'+name,PORT:'5001',CORS_ALLOWED_ORIGINS:'http://127.0.0.1:5173,http://localhost:5173'}}).catch(()=>{console.error('Disposable backend startup failed');process.exitCode=1})"
```

Verify port 5001 belongs to that startup process before making requests. Do not
continue on bind/startup failure or target an already-running server. To add a
browser smoke test, launch Vite in another dedicated terminal with an explicit
local API override; otherwise it defaults to the deployed backend:

```powershell
Set-Location E:\CyberSudarShan\frontend
$env:VITE_API_BASE_URL = 'http://127.0.0.1:5001'
npm run dev -- --host 127.0.0.1
# After stopping Vite, clear this terminal-only override:
Remove-Item Env:VITE_API_BASE_URL
```

No breach-provider call is needed for persistence verification. Do not exercise
the real breach endpoint during this local test unless its provider is separately
mocked. No frontend backend-secret variable is required.

## Persistence execution and cleanup protocol for the next run

Before any write, an operator/test runner must establish all of the following:

1. The fresh local server above is running from the recorded disposable directory;
   the URI is fixed to `127.0.0.1:37017` with no credentials/extra hosts/options.
2. The database name exactly matches the generated `cyber_sudarshan_test_<32 hex>`
   value and has no pre-existing application records. Abort if it is not empty;
   never empty it to make the test pass.
3. Every synthetic account, title, message and report includes a fresh run marker,
   for example a GUID; use an email under `example.invalid` and a unique sender.
4. Record each created `_id` and collection in a run-owned ledger immediately.
   Where the API returns only an acknowledgement, query the exact unique marker
   in the relevant collection to capture the created ID. Do not print passwords,
   hashes, admin credentials or connection strings.

Perform the flows in the model table against `http://127.0.0.1:5001`, preserving
their documented request bodies and exact statuses. Use direct database reads to
confirm contact/emergency/chat writes and hidden pending news. For stronger
durability evidence, close/reopen the database connection and repeat reads; HTTP
acknowledgements alone do not establish persistence. Verify the physical User
email index before separately testing its uniqueness enforcement; do not use an
index-reset or migration command.

Cleanup belongs in a `finally` path, including after failed assertions. Recheck
the server/database identity and run ownership before deleting. For each ledger
entry, use a single-record filter containing **both** its `_id` and exact run
marker (email/title/message as appropriate). Verify each removal with a read.
Authorized blog/news API deletion may be used for known test IDs, followed by a
database read. Use direct record-scoped cleanup for User, Chat, Contact and
Emergency, which have no deletion endpoints. Never use `deleteMany({})`, collection
drop, database drop, index resets or a broad name-prefix deletion. Unknown or
ambiguous records are not cleanup targets; leave them and report the discrepancy.

Stop the backend before stopping the dedicated MongoDB process with Ctrl+C. Keep
the recorded disposable directory for inspection rather than issuing an automatic
recursive deletion. Clear the temporary `CYBER_TEST_DB_NAME` variable when done.
This is a future execution protocol, not an implemented/executed real-DB suite.

## Regression commands actually executed

| Directory / command | Result |
| --- | --- |
| Backend `npm test` | Exit 0: 64 passed, 0 failed, 0 skipped. |
| Frontend `node --test test/*.test.js` | Exit 0: **40 passed in one completed command**, 0 failed, 0 skipped. Includes the six real-HTTP/mocked-persistence integration tests. |
| Frontend `npm run lint` | Exit 0; 0 errors/warnings. |
| Frontend `npm run build` | Exit 0; Vite 7.3.1, 2109 modules. Existing old-Browserslist-data warning remains. |
| `node --check` over backend and frontend plain JS/MJS helpers/tests | 37 files passed; JSX compilation checked by lint/build. |
| Offline model collection/index inspection | Six collection identities confirmed; User's declared unique email index confirmed; no DB connection. |
| `git diff --check` and new document whitespace check | Passed; existing LF/CRLF advisories only. |

No execution approval was denied in Task 4. Existing MockTimers experimental
warnings remain. An initial `rg` route search used a Windows-incompatible glob;
the corrected directory search completed. It did not affect test execution.

## Changes, preserved work and remaining gaps

Only this document and a follow-up pointer in `integration-readiness.md` changed.
All application files, dependency manifests/locks and all 104 existing tests are
unchanged. The pre-edit SHA-256 inventory of 84 tracked/non-ignored files is saved
outside the repository as `cyber-sudarshan-task4-baseline.json` in the task's Codex
visualization directory. Existing tracked and untracked work was preserved.

No confirmed defect was fixed: no real persistence experiment was possible. All
signup/login, blog/news/chat, contact and emergency persistence behavior exercised
by the current suites used mocks. No real-database flow passed or failed here.
The current unique index's physical existence, duplicate-key races, reconnect/
restart durability and database-backed cleanup therefore remain unverified.

The combined frontend gate is now resolved. The next step is provisioning the
explicitly disposable MongoDB instance and carrying out the guarded persistence
protocol above. Browser-to-real-database, hosted configuration/proxy/CORS and
external-provider compatibility remain separate gaps. No packages were installed,
services deployed, files staged/committed or changes pushed. These regression
results do not establish production readiness.
