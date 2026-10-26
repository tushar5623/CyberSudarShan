# Phase 2 security containment

## Security Hardening Task 1 update

Current behavior supersedes historical broad-CORS/parser-error observations below.
Set backend `CORS_ALLOWED_ORIGINS` to the exact frontend HTTP(S) origins, comma-
separated, without trailing slashes/paths, wildcard, credentials, queries or fragments.
For local development, explicitly use
`http://127.0.0.1:5173,http://localhost:5173` (adjust to Vite's actual port).
For deployment, the operator must supply the actual verified frontend origin(s);
none were guessed or configured remotely. `NODE_ENV=production` fails startup if
this variable is missing/invalid, before database access. Other environments default
to no browser origins when absent. Originless API clients remain supported; CORS
does not authenticate requests or prevent non-browser abuse.

Malformed/non-scalar auth fields now return 400 before queries/hashing. Parser
failures return fixed JSON without request fragments or logging exceptions; the
400/413/415 statuses remain. Emergency/blog failure logging now uses fixed messages
without error objects. Existing successful contracts, admin checks, limiter sharing,
proxy configuration and startup lifecycle remain unchanged. See
[`docs/security-hardening-1.md`](../docs/security-hardening-1.md) for full evidence,
explicit compatibility changes and product decisions that remain outstanding.

## Startup and configuration

Run `npm ci`, then `npm start` from `backend/`. Use Node.js 22.12 or newer in
the Node 22 line to satisfy the repository's existing backend/frontend engines.
Provide `ADMIN_SECRET` and `MONGO_URI` through backend-only environment variables.
The example file deliberately leaves both blank. Do not use the example as a
working credential, and never put these secrets in `VITE_*` variables.

Missing, empty or whitespace-only admin configuration stops startup. The secret
is compared exactly, including intentional surrounding spaces. No fallback
credential exists. Startup validates configuration before connecting, awaits
MongoDB, then starts HTTP. Database connection failures produce a generic error
and nonzero process exit; connection strings and underlying errors are not logged
by this startup path. Bind failures also fail startup and close the DB connection.

There is no new health endpoint. The startup logs distinguish initial database
readiness from HTTP listening. Initial readiness is not a guarantee of continuing
database availability; ongoing connection monitoring, readiness probes and
graceful shutdown remain future work.

## Admin API compatibility

Existing methods and paths are unchanged. Blog create/update/delete, news admin
listing/approval/deletion use JSON `adminPassword`; `/api/verify-admin` retains
JSON `password`. Missing, blank, non-string and incorrect credentials return
HTTP 401 with `{ success: false, error: "Unauthorized", message: "Invalid admin credentials." }`.
Blog creation previously returned 403 for an invalid password; it now uses 401
consistently. Successful response shapes remain unchanged.

`POST /api/news` without `adminPassword` remains public and stores `pending`,
ignoring supplied `status`, `role` or `isAdmin`. Supplying `adminPassword` explicitly
requests the existing immediate-publishing workflow: valid credentials store
`approved`; invalid credentials return 401 without saving. Previously, an invalid
explicit credential silently fell back to a pending submission. This stricter
behavior prevents failed admin publishing from appearing successful.

The shared secret is containment, not individual admin authentication. It has
no account identity, session lifecycle or per-admin audit trail. The backend
captures the configured secret when creating the app; rotation requires restart.

## Rate limits

All budgets are per client IP, count successful and failed requests reaching the
route limiter, and return HTTP 429 with JSON error/message, `Retry-After`, and
standard rate-limit headers. JSON parsing occurs before these route limiters;
malformed JSON is rejected by Express rather than counted in these budgets.

| Budget | Default | Window | Environment override |
| --- | --- | --- | --- |
| Login | 10 | 15 minutes | `AUTH_RATE_LIMIT_MAX` |
| Signup, independent of login | 10 | 15 minutes | `AUTH_RATE_LIMIT_MAX` |
| All admin routes combined, including explicit admin news submissions | 60 | 15 minutes | `ADMIN_RATE_LIMIT_MAX` |
| Contact, emergency, news: independent budget for each endpoint | 20 each | 15 minutes | `PUBLIC_WRITE_RATE_LIMIT_MAX` |
| Chat writes | 60 | 1 minute | `CHAT_RATE_LIMIT_MAX` |
| Breach lookups, across all queried emails | 10 | 1 minute | `BREACH_RATE_LIMIT_MAX` |

Explicit admin news requests count against both news and admin budgets. Public
blog/news/chat reads are not limited by these middleware. Administrative route
rotation cannot reset the shared admin budget. Overrides must be positive safe
integers; invalid values stop startup. Fixed windows avoid unnecessary knobs.

These defaults allow ordinary individual use, but users behind one NAT share
budgets. Review real traffic before changing limits, especially community access
from schools or offices. These are application limits, not a volumetric DDoS
defense. An upstream edge/WAF should bound traffic and malformed-body abuse.

The default store is **in memory per process**. Restarts reset counters, and
instances do not share budgets. Before horizontal scaling, configure a supported
shared store (such as Redis), with distinct key prefixes for independent budgets,
and test store failure behavior. No distributed protection is claimed here.

## Reverse proxy deployment: manual action required

Default Express `trust proxy` is false. Arbitrary `X-Forwarded-For` and `Forwarded`
headers cannot select the client identity used by the limiter. The limiter's
unexpected-X-Forwarded-For diagnostic is disabled because ignoring that header
when proxy trust is off is intentional; IP/subnet handling is still provided by
express-rate-limit.

If a verified reverse proxy sits in front of the app, set `TRUSTED_PROXY_CIDRS`
to its actual source IP addresses or narrowly scoped IPv4/IPv6 CIDRs. This is an
explicit allowlist, not a boolean or hop count. `true`, numeric hop shortcuts,
hostnames and `/0` ranges are rejected. Do not broadly trust the internet or a
shared network. The proxy must overwrite/sanitize incoming forwarding headers,
and direct access must not let clients impersonate a trusted proxy.

Verify the deployment provider's current proxy topology and source ranges before
setting this value; this repository does not establish Render's actual topology.
With no trusted-proxy configuration, proxied users may all share the proxy IP's
budget. Validate both real client separation and spoofed-header rejection in
staging before production rollout. No production settings were changed.

## Breach lookup failure handling (Step 4B)

The breach limiter and successful JSON shapes are unchanged. Provider HTTP errors
(including 404/429/500), network errors, invalid JSON and unexpected data return
502; exceeding the 10-second provider request/body deadline returns 504. Both use
`{ "error": "Breach lookup unavailable. Please try again later." }` with no `safe`
field. Redirects are rejected. Only validated 2xx breach arrays yield success;
provider error envelopes never establish safety. Logs contain a fixed message,
not raw provider exceptions or content. Requests are aborted and timers cleared
after completion. See `docs/api-contracts.md` for schema and compatibility details,
including the intentional loss of the old unconditional 404-to-safe translation.
This does not verify the live provider's no-result semantics or accuracy.

## Tests and remaining scope

`npm test` uses Node's built-in runner, an ephemeral loopback HTTP server, real
Express middleware and Mongoose document validation, and mocked persistence,
database connection and external breach lookup. It never loads `.env` into the
test app or needs a live database. The CLI missing-secret test forces an empty
admin configuration and cannot reach MongoDB. Run the suite in an isolated local
or CI environment, not against production services.

Mocks do not establish real MongoDB connectivity, indexes, TLS, uniqueness or
durability. Check these in staging with an isolated database before deployment.
Frontend build/lint checks are separate from the backend suite.

Deferred findings remain: server-managed user sessions/roles, public chat identity
spoofing, comprehensive input validation, broad CORS, dependency advisory review,
live breach-provider contract/accuracy, chat ordering, frontend error states,
ongoing readiness monitoring, retention and backups. Passing this suite does not
make the whole application production-secure.

References: [express-rate-limit usage](https://express-rate-limit.mintlify.app/quickstart/usage),
[configuration](https://express-rate-limit.mintlify.app/reference/configuration),
[Express proxy trust](https://expressjs.com/en/guide/behind-proxies.html).
