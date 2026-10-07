# @th-postway/post-sdk

TypeScript SDK for the Postway Merchant API. ESM-only, **zero runtime dependencies** (native `fetch`), Node >= 22.12 at runtime, >= 22.13 for the dev toolchain. Built with plain `tsc`; tested with Vitest.

## Commands

- `npm run check` — typecheck + lint + format:check + unit tests. Run before every commit.
- `npm test` / `npm run test:watch` — unit tests (mocked fetch, no network).
- `npm run build` — emits `dist/` (ESM + `.d.ts`, no maps).
- `npm run test:integration` — read-only live tests; skipped without `POSTWAY_MERCHANT_BASE_URL` and `POSTWAY_MERCHANT_ACCESS_TOKEN`.

## Layout

```
src/index.ts          public surface; export * from the four folder barrels below
src/core/             client.ts, http-client.ts, errors.ts, environments.ts, validation.ts, version.ts
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
- `redirect: 'error'` stays. No retries on non-idempotent calls.
- No `console.*`, no `process.env` reads in `src/`.
- No tokens, tracking numbers, refs or response bodies in error messages. `PostwayApiError.body` stays non-enumerable.
- No internal infrastructure names (hosts, ports, service/framework names, private package names) anywhere in code, comments, tests or docs. Public hosts are only the two in `src/core/environments.ts`.

## Release

Bump `version` + `SDK_VERSION`, update `CHANGELOG.md`, commit, tag `v22.x.y`, push the tag. The Publish workflow checks tag == version, runs `npm run check`, and publishes with provenance.
