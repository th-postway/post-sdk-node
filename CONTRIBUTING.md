# Contributing

## Setup

```bash
nvm use        # Node 22 from .nvmrc; the dev toolchain needs >= 22.13 (the package runs on >= 22.12)
npm ci
npm run check  # typecheck + lint + format:check + unit tests
```

Other scripts: `npm test` / `npm run test:watch`, `npm run lint:fix`, `npm run format`, `npm run build`.

## Layout

```
src/index.ts          public surface: re-exports the four folder barrels
src/core/             client, http-client, errors, environments, validation, version
src/resources/        one class per API area; methods map 1:1 to endpoints
src/types/            request/response types, one file per resource (plural kebab-case), plus enums
src/utils/            small helpers (decodeFile)
test/unit/core        client and HTTP-layer tests
test/unit/resources   one file per resource, asserting method, URL, headers and body
test/unit/support     mocked fetch and response builders
test/integration      read-only live checks, skipped without credentials
```

## Conventions

- Files are kebab-case; resource and type files share the same plural name (`order-shipments.ts`).
- Imports are relative with a `.js` extension and point at concrete modules. Only `index.ts` files re-export; `src/index.ts` is the public surface and `test/unit/package-surface.test.ts` snapshots it. Update both together.
- Type fields use the wire names (`snake_case`) so payloads match the API schema.
- No runtime dependencies. Native `fetch` only.
- `SDK_VERSION` in `src/core/version.ts` must equal `version` in `package.json` (enforced by a test).
- Never log, never read environment variables in `src/`.

### Security rules

- `PostwayConfigError` messages never repeat the offending value.
- Every caller-supplied path segment goes through `param()` in `src/core/http-client.ts`, so it is validated and shown as `:name` in errors.
- Header values go through the validators in `src/core/validation.ts`.
- Keep `redirect: 'error'`.
- No internal hostnames, ports, service names or private package names anywhere in code, comments, tests or docs.

## Adding an endpoint

1. Add the request/response types to `src/types/<resource>.ts` (or a new file plus a line in `src/types/index.ts`).
2. Add the method to `src/resources/<resource>.ts`; wrap path parameters in `param()`.
3. Add a test to `test/unit/resources/<resource>.test.ts` asserting method, URL, headers and body.
4. Add a row to the method catalogue in `README.md` and a line under `Unreleased` in `CHANGELOG.md`.

## Integration tests

Read-only, skipped unless both variables are set:

```bash
POSTWAY_MERCHANT_BASE_URL=https://sandbox-post.postway.co.th/merchant \
POSTWAY_MERCHANT_ACCESS_TOKEN=... \
npm run test:integration
```

## Releasing

1. Bump `version` in `package.json` and `SDK_VERSION` in `src/core/version.ts`.
2. Move the `Unreleased` entries in `CHANGELOG.md` under the new version with today's date.
3. Commit, then tag and push: `git tag v22.x.y && git push origin main v22.x.y`.
4. The `Publish` workflow verifies the tag matches the version, runs `npm run check`, and publishes with npm provenance. It needs an `NPM_TOKEN` repository secret (granular token with publish rights). Once the package exists on npm, switch to npm trusted publishing (OIDC) and drop the secret.
