# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# @th-postway/post-sdk

TypeScript SDK for the Postway Merchant API. ESM-only, **zero runtime dependencies** (native `fetch`), Node >= 22.12 at runtime, >= 22.13 for the dev toolchain. Built with plain `tsc`; tested with Vitest.

## Commands

- `npm run check` — typecheck (src, test and `demo/`) + lint + format:check + unit tests. Run before every commit.
- `npm test` / `npm run test:watch` — unit tests (mocked fetch, no network).
- Single file / single test: `npx vitest run --project unit test/unit/resources/labels.test.ts` (add `-t '<test name>'`).
- `npm run lint:fix`, `npm run format` — autofix.
- `npm run build` — emits `dist/` (ESM + `.d.ts`, no maps).
- `npm run test:integration` — read-only live tests; skipped without `POSTWAY_MERCHANT_BASE_URL` and `POSTWAY_MERCHANT_ACCESS_TOKEN`.
- `npm run demo` — builds, then runs `demo/quick-start.ts` against **sandbox** (needs `POSTWAY_ACCESS_TOKEN`; read-only unless `POSTWAY_DEMO_CREATE=1`). `demo/tsconfig.json` maps the package name to `src/`, so `check` covers it without a build. Details in `demo/README.md`.

## Architecture

`PostwayMerchantClient` (`src/core/client.ts`) validates options, builds one `HttpClient`, and hands it to every resource. Resources are thin: each method only describes an `HttpCall` (`method`, `path` segments, `query`, `body`, `auth`) and spreads the caller's `RequestOptions` (`signal`, `timeoutMs`) into it. Resource methods hold no HTTP logic.

`HttpClient` (`src/core/http-client.ts`) does everything else: URL building and redaction (`url()` vs `routeUrl()`), headers, timeout + abort-signal merging, body parsing, and mapping failures to `PostwayApiError` / `PostwayRequestError`. Resources pick one of two entry points:

- `request<T>()` returns the parsed body as-is. Most routes use this.
- `requestEnvelope<T>()` expects `{ code, isSuccess, message, data }`, returns `data`, and throws `PostwayBusinessError` for a 2xx with `isSuccess: false`. Only `orderShipments.create` and `cancel` need it, because they can fail with HTTP 201.

For `auth: true` calls, `AccessTokenManager` (`src/core/access-token.ts`) supplies the token. With a static `accessToken`, it just returns it. With `getAccessToken`, it fetches the first token, works out the token's lifetime (from `expiresAt`, else the JWT `exp`/`iat`, else one `POST auth/account/info` probe per token, using `observesSession`), refreshes once ≥75% of that lifetime has passed, and lets concurrent callers share a single in-flight refresh. `#sendChecked` replays a call once after a 403, and only when a provider exists.

Unit tests drive the real client through `setup(responses, options)` in `test/unit/support/mock-fetch.ts`. It queues `Response`s in order, records each call's URL, method, headers, body and `redirect`, and throws on any unexpected extra request.

## Layout

```
src/index.ts          public surface; export * from the four folder barrels below
src/core/             client.ts, http-client.ts, access-token.ts, errors.ts, environments.ts, validation.ts, version.ts
src/resources/        one class per API area, kebab-case plural (order-shipments.ts)
src/types/            one type file per resource with the same name, plus enums.ts and common.ts
src/utils/            decode-file.ts
test/unit/core        client and HTTP-layer tests
test/unit/resources   one file per resource
test/unit/support     mock-fetch.ts: setup(), json(), empty(), text(), apiError(), only()
test/integration      live, read-only
```

## Rules

- Imports are relative with `.js` extensions and target concrete modules. Only `index.ts` files re-export (ESLint enforces this inside `src/`).
- `src/index.ts` is the public surface. `test/unit/package-surface.test.ts` snapshots the export list (29 keys today). Change both together, deliberately.
- Never add a runtime dependency.
- `SDK_VERSION` in `src/core/version.ts` must equal `package.json` `version` (test-enforced).
- Type fields use wire names (`snake_case`). Keep the API's model names in JSDoc backticks.
- Every endpoint gets: a resource method, types, a row in the README method catalogue, and a unit test asserting method, URL, headers and body.
- Formatting is Prettier's (`printWidth` 120, single quotes, trailing commas). Do not hand-format.

## Security rules (non-negotiable)

- `PostwayConfigError` messages never include the offending value.
- Caller-supplied path segments are wrapped in `param(name, value)` so they are validated and appear as `:name` in error URLs and messages.
- All header values pass through `src/core/validation.ts`. `baseUrl` must be https (http only for loopback), with no credentials, query or fragment.
- `redirect: 'error'` stays. No retries, except the single replay of an authenticated call after a 403 when `getAccessToken` refreshed the token (`src/core/access-token.ts`).
- No `console.*`, no `process.env` reads in `src/`.
- No tokens, tracking numbers, refs or response bodies in error messages. `PostwayApiError.body` stays non-enumerable.
- No internal infrastructure names (hosts, ports, service/framework names, private package names) anywhere in code, comments, tests or docs. Public hosts are only the two in `src/core/environments.ts`.

## Release

git-flow with default settings; versions are SemVer `MAJOR.MINOR.PATCH` with no `v` prefix. `git flow release start 22.x.y` from `develop`, bump `version` + `SDK_VERSION`, update `CHANGELOG.md`, commit, push the release branch (CI checks branch == version), `git flow release finish 22.x.y` (merges to `main`, tags `22.x.y`, merges back to `develop`), then `git push --atomic origin main develop 22.x.y`. The Publish workflow runs only for `MAJOR.MINOR.PATCH` tags, checks the tag is on `main` and equals the version, runs `npm run check`, and publishes with provenance. Full steps in CONTRIBUTING.md.
