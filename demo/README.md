# Demo

`quick-start.ts` is a runnable version of the [README Quick start](../README.md#quick-start). It walks one Merchant flow with this repository's SDK. The Python and .NET SDKs ship the same demo.

1. `health.ping()`: public, so it works without a token.
2. `auth.accountInfo()`: store name and token expiry.
3. `shipmentProviders.all()`: couriers the store may use.
4. `thailand.filter()`: postal areas for zip code `10500`.
5. `orderShipments.filter()`: the store's parcel count and the status of the latest five.
6. _Opt-in, sandbox only:_ `orderShipments.create()` followed by `labels.orderShipments()`, which saves the label to `demo/output/`.

The demo is **read-only by default** and targets **sandbox**, unlike the SDK, which defaults to production.

## Requirements

- Node.js ≥ 22.12. The demo is TypeScript run with Node's built-in type stripping (`--experimental-strip-types`). From Node 22.18 that is on by default and the flag is harmless. Node may print an `ExperimentalWarning`.
- A merchant session access token. Postway issues it to your store; there is no token endpoint.

## Run

```bash
npm ci
export POSTWAY_ACCESS_TOKEN=...   # from your shell or secret manager, never committed
npm run demo                      # builds dist/, then runs demo/quick-start.ts
```

`npm run demo` builds first because the demo imports `@th-postway/post-sdk`, exactly as an application would. Node resolves that name to this package's own `dist/` through the `exports` map (package self-reference). To skip the rebuild: `node --experimental-strip-types demo/quick-start.ts`.

| Variable                                      | Required      | Meaning                                                                                                                               |
| --------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `POSTWAY_ACCESS_TOKEN`                        | for steps 2–6 | Merchant session token. `POSTWAY_MERCHANT_ACCESS_TOKEN` (used by integration tests) also works                                        |
| `POSTWAY_MERCHANT_BASE_URL`                   | no            | Base URL override. Default: `https://sandbox-post.postway.co.th/merchant`                                                             |
| `POSTWAY_DEMO_CREATE`                         | no            | `1` runs step 6                                                                                                                       |
| `POSTWAY_CLIENT_ID` / `POSTWAY_CLIENT_SECRET` | no            | The store's client credentials. Not read by the demo or the SDK: the API has no token endpoint, so authenticate with the access token |

The demo reads environment variables only. To keep them in a local `.env` (gitignored, never committed), load it first: `set -a; . ./.env; set +a; npm run demo`.

Without a token the demo pings, prints which variable to set, and exits with code 1. A 403 means the token is missing, unknown or expired.

## Creating a parcel (opt-in)

```bash
POSTWAY_DEMO_CREATE=1 npm run demo
```

Step 6 creates a **real sandbox parcel** from the Quick start payload. The courier is the first one `shipmentProviders.all()` returns, and `my_tracking_no` is generated as `DEMO-<unix ms>`. `orderShipments.create` is not idempotent, so every run creates a new parcel. The demo refuses this step unless the base URL is the sandbox URL. The label is written to `demo/output/` (gitignored).

## Using the local SDK in another project

```bash
npm run build                      # in this repository
cd ../my-app
npm install ../post-sdk-node       # or: npm link in this repository, then npm link @th-postway/post-sdk
```

Then copy `quick-start.ts` into that project and run it the same way.

## Checks

`demo/tsconfig.json` maps `@th-postway/post-sdk` to `../src/index.ts`, so `npm run check` typechecks, lints and format-checks the demo against the source without a build. The demo is not in the published package (`files` lists only `dist` and `CHANGELOG.md`).
