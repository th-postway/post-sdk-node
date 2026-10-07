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

## Branches and releases

The repository uses git-flow with its default settings (no tag prefix):

| Branch                  | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `main`                  | released code; every release is a tag on it           |
| `develop`               | integration branch; open pull requests against it     |
| `feature/*`, `bugfix/*` | work branches, started from `develop`                 |
| `release/<version>`     | release preparation, started from `develop`           |
| `hotfix/<version>`      | urgent fix to a released version, started from `main` |

Versions are SemVer `MAJOR.MINOR.PATCH` with **no `v` prefix**, used as is in branch and tag names: `release/22.1.0` becomes tag `22.1.0`. The major stays `22`.

CI (`.github/workflows/ci.yml`) runs on pushes to `main`, `develop`, `release/**` and `hotfix/**`, and on every pull request. On `release/*` and `hotfix/*` it also fails unless the branch name is `MAJOR.MINOR.PATCH` and equals `version` in `package.json`. Dependabot opens its pull requests against `develop`.

### Releasing

1. `git flow release start 22.x.y` (from `develop`).
2. Bump `version` in `package.json` and `SDK_VERSION` in `src/core/version.ts`, move the `Unreleased` entries in `CHANGELOG.md` under `[22.x.y]` with today's date, and commit.
3. `git push -u origin release/22.x.y` and wait for CI.
4. `git flow release finish 22.x.y`: merges into `main`, tags `22.x.y` there, and merges back into `develop`.
5. `git push --atomic origin main develop 22.x.y`, then delete `release/22.x.y` on the remote if it is still there.

For an urgent fix, run the same steps with `git flow hotfix start 22.x.y` (from `main`) and `git flow hotfix finish 22.x.y`.

The `Publish` workflow (`.github/workflows/publish.yml`) runs only for tags matching `MAJOR.MINOR.PATCH`; a `v`-prefixed or pre-release tag does not start it. It checks that the tag is on `main` and equals `version` in `package.json`, runs `npm run check`, and publishes with npm provenance.

GitHub setup: an `npm` environment and an `NPM_TOKEN` secret (granular token with publish rights). Limit the environment's deployment tags to `[0-9]*.[0-9]*.[0-9]*`. Once the package exists on npm, switch to npm trusted publishing (OIDC) and drop the secret.

Never move or reuse a published tag. If `Publish` fails for a transient reason, re-run it; otherwise fix forward with a hotfix and the next patch version.
