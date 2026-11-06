# Security policy

Do not publish credentials, personal incident reports, or exploit details in public
issues. Use the repository host's private vulnerability reporting feature when it is
enabled, or privately contact the repository owner through a verified channel. No
response-time commitment or security certification is implied.

## Trust boundaries

- Accounts use bcrypt and opaque database-backed sessions. Session tokens are hashed
  at rest, expire server-side, and are revoked by logout.
- Chat writes trust the authenticated user rather than a supplied sender or user ID.
- Public news tips cannot approve themselves. Admin writes require the backend secret.
- CORS is browser isolation, not authentication. Rate limiting is per process.
- Boundary validation and field allowlists limit query injection and mass assignment.
- Backend failures and logs must not expose bodies, tokens, or connection strings.

## Before public production use

Verify real persistence, unique and TTL indexes, HTTPS and proxy configuration,
backup restoration, browser flows, and monitoring. Replace shared admin credentials
with individual roles and audit history for a multi-operator deployment. Use a shared
rate-limit store for multiple API replicas.

Evaluate a same-origin HttpOnly-cookie design and CSRF controls if changing the
current cross-origin bearer-session deployment. Browser-readable session storage is
not resistant to XSS. A clean dependency audit means no known advisory was reported
at that moment; it is not a security guarantee.

See [the quality review](docs/quality-review.md) for verification and remaining gaps.
