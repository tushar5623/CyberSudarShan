# Contributing

Use Node 22.19.0 and the committed lockfiles. Install root tooling with `npm ci`,
then both applications with `npm run setup`. Keep local environment files private.

## Change workflow

1. Keep behavior in its owning feature module or shared utility.
2. Validate untrusted input at the HTTP boundary and select writable fields explicitly.
3. Add regression tests for bugs, authorization changes, and failure paths.
4. Run `npm run format`, `npm run lint`, and `npm test`.
5. Set an explicit HTTPS `VITE_API_BASE_URL` and run `npm run build`.
6. Document API, configuration, and migration changes in the same pull request.

Tests must use synthetic data and loopback HTTP. Do not load `.env`, connect to a
live database, or invoke external providers from the default test suite. Existing
integration tests exercise frontend transport against Express with mocked persistence.

Pull request descriptions should explain the problem, changed behavior, verification,
and remaining limitations. Keep UI redesigns separate from functional fixes. Never
commit secrets, generated assets, dependencies, logs, or private incident reports.

Dependency changes must update the relevant lockfile, pass the same checks, and run
`npm audit` in both application directories. Avoid forced major upgrades unless their
breaking changes have been reviewed. CI covers Windows and Linux; local success does
not prove hosted workflow or deployment behavior.
