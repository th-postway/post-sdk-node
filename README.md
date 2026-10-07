# @th-postway/post-sdk

TypeScript SDK for the **Postway Merchant API**: create and track parcels, quote prices, print labels and receipts, and look up Thai postal areas. It covers every live Merchant endpoint, has zero runtime dependencies (native `fetch`), and ships as ESM with bundled type declarations.

- [Requirements](#requirements)
- [Install](#install)
- [Quick start](#quick-start)
- [Authentication](#authentication)
- [Environments](#environments)
- [Method catalogue](#method-catalogue)
- [Errors](#errors)
- [Labels and receipt files](#labels-and-receipt-files)
- [Units and conventions](#units-and-conventions)
- [Development](#development)
- [Mapping from the .NET SDK](#mapping-from-the-net-sdk)

## Requirements

**Node.js ≥ 22.**

The package is ESM-only (`"type": "module"`), and `import` works on every Node 22.x. Node 22.12 is the first LTS release where `require()` of an ES module works without a flag, so CommonJS callers need Node ≥ 22.12. One build serves both module systems:

```js
import { PostwayMerchantClient } from '@th-postway/post-sdk'; // ESM
const { PostwayMerchantClient } = require('@th-postway/post-sdk'); // CommonJS, Node >= 22.12
```

Types resolve through the `exports` map under both `moduleResolution: "nodenext"` and `"bundler"`.

## Install

```bash
npm install @th-postway/post-sdk
```

## Quick start

```ts
import { PostwayMerchantClient, LabelSize, LabelOrientation, decodeFile } from '@th-postway/post-sdk';
import { writeFile } from 'node:fs/promises';

const postway = new PostwayMerchantClient({
  accessToken: process.env.POSTWAY_ACCESS_TOKEN, // never hardcode it
  environment: 'production', // default
});

const account = await postway.auth.accountInfo();
console.log(account.store.name, 'token expires', account.session.expired);

const [parcel] = await postway.orderShipments.create({
  shipping: { shipment_provider_name: 'Flash', my_tracking_no: 'ORDER-1001' },
  sender: {
    fullname: 'My Shop',
    mobile_phone: '0811111111',
    address: '1 Silom Rd',
    sub_district: 'สีลม',
    district: 'บางรัก',
    province: 'กรุงเทพมหานคร',
    zip_code: '10500',
  },
  recipient: {
    fullname: 'Customer',
    mobile_phone: '0822222222',
    address: '2 Nimman Rd',
    sub_district: 'สุเทพ',
    district: 'เมืองเชียงใหม่',
    province: 'เชียงใหม่',
    zip_code: '50200',
  },
  package: { insurance_value: 0, weight: 500, width: 10, length: 20, height: 5 },
  product_cods: [], // empty = not COD
});

const label = await postway.labels.orderShipments({
  tracking_nos: [parcel!.package.tracking_no],
  label_size: LabelSize.Size4x6,
  label_orientation: LabelOrientation.Portrait,
});
await writeFile(label.file_name, decodeFile(label));
```

## Authentication

The Merchant API uses a **merchant session access token**. Postway issues it to your store out of band; there is no token endpoint in the API. The SDK sends it as:

```
Authorization: Bearer <accessToken>
```

- The server looks up the session by token type plus token, so pass `tokenType` only if Postway gave you a different type. The default is `"Bearer"`.
- Every call acts as the **owner of the store** the token belongs to, and every query is scoped to that store.
- A missing, unknown or **expired** token gets HTTP **403**. `auth.accountInfo()` returns `session.expired`, so you can rotate the token before it expires.
- `receipts.*` and `health.ping()` are public and never send the token. Every other method throws `PostwayConfigError` before any network call if the client has no `accessToken`.

## Environments

| `environment`            | Base URL                                      |
| ------------------------ | --------------------------------------------- |
| `production` _(default)_ | `https://post.postway.co.th/merchant`         |
| `sandbox`                | `https://sandbox-post.postway.co.th/merchant` |

`baseUrl` overrides `environment`:

```ts
new PostwayMerchantClient({ baseUrl: 'https://sandbox-post.postway.co.th/merchant', accessToken });
```

### Client options

| Option        | Default                             | Notes                                               |
| ------------- | ----------------------------------- | --------------------------------------------------- |
| `accessToken` | —                                   | Merchant session token                              |
| `tokenType`   | `"Bearer"`                          | First word of `Authorization`                       |
| `environment` | `"production"`                      | See table above                                     |
| `baseUrl`     | from `environment`                  | Absolute URL; trailing `/` ignored                  |
| `timeoutMs`   | `60000`                             | Per request; override per call with `{ timeoutMs }` |
| `fetch`       | `globalThis.fetch`                  | Inject for proxies, tracing or tests                |
| `userAgent`   | `postway-sdk-node/<ver> node/<ver>` |                                                     |

Every method takes a final `options` argument: `{ signal?: AbortSignal, timeoutMs?: number }`.

## Method catalogue

Paths are relative to the base URL.

| Method                                                                   | HTTP                                                 | Auth | Returns                                                               |
| ------------------------------------------------------------------------ | ---------------------------------------------------- | ---- | --------------------------------------------------------------------- |
| `auth.accountInfo()`                                                     | `POST auth/account/info`                             | ✓    | `MerchantAuthAccountInfoResponse`: store, owner, `session.expired`    |
| `orderShipments.getByTrackingNo(trackingNo)`                             | `GET order-shipment/get-by-tracking-no/:tracking_no` | ✓    | `MerchantOrderShipmentData \| null`                                   |
| `orderShipments.getByRef(ref)`                                           | `GET order-shipment/get-by-ref/:ref`                 | ✓    | `MerchantOrderShipmentData \| null`; matches `ref1`, `ref2` or `ref3` |
| `orderShipments.filter({ filter?, page, limit })`                        | `POST order-shipment/filter`                         | ✓    | `FilterResponse<MerchantOrderShipmentData>`, newest first             |
| `orderShipments.create(request \| request[])`                            | `POST order-shipment/create`                         | ✓    | `MerchantOrderShipmentData[]`                                         |
| `orderShipments.calculatePrice(request)`                                 | `POST order-shipment/calculate-price`                | ✓    | `{ price_infos, plan_detail }`                                        |
| `orderShipments.cancel(trackingNo)`                                      | `POST order-shipment/cancel`                         | ✓    | `void`                                                                |
| `shipmentProviders.all()`                                                | `GET shipment-provider/all`                          | ✓    | `MerchantShipmentProviderData[]`: couriers this store may use         |
| `thailand.filter({ page, limit, ... })`                                  | `POST thailand/filter`                               | ✓    | `FilterResponse<MerchantThailand>`                                    |
| `labels.orderShipments({ tracking_nos, label_size, label_orientation })` | `POST label/order/shipments`                         | ✓    | `FileHttpResponse` (base64)                                           |
| `labels.receipt(receiptNo, { receiptSize? })`                            | `GET label/receipt/:receipt_no?receipt_size=`        | ✓    | `FileHttpResponse` (base64)                                           |
| `receipts.getPublic(token)`                                              | `GET receipt/public/:token`                          | —    | `PublicReceiptResponse`                                               |
| `receipts.getPublicHtml(token)`                                          | `GET receipt/:token`                                 | —    | HTML `string`                                                         |
| `receipts.publicUrl(token)`                                              | _(no request)_                                       | —    | URL of the public receipt page                                        |
| `health.ping()`                                                          | `GET health/ping`                                    | —    | `"pong"`                                                              |

Behaviour worth knowing:

- **`orderShipments.create`** accepts one request or an array; the server always receives an array. Each parcel is priced, verified, created, booked with the courier, and covered by one receipt. It is **not idempotent** and the SDK never retries it. A batch stops at the first failing parcel, and parcels created before that failure remain. On `PostwayBusinessError`, look them up by `my_tracking_no` (`orderShipments.filter`) before you resubmit.
- **`orderShipments.cancel`** matches the courier `tracking_no` only, not `my_tracking_no` or refs.
- **`labels.orderShipments`**: each `tracking_nos` entry may be a `tracking_no`, `my_tracking_no` or `ref1..3`. If none match, the server returns 400.
- **`thailand.filter`**: the field filters (`sub_district`, `district`, `province`, `zip_code`) are exact matches. `shipment_provider_names` restricts results to areas served by those couriers; omit it for all. The response spells the zip field `zipcode`.
- **`shipment_provider_name` / `shipment_name`** take a `name` from `shipmentProviders.all()`.
- **`filter` paging**: `limit` must be 1..1,000,000 and `page` ≥ 1. A page past the end wraps to page 1.

Enums such as `LabelSize`, `LabelOrientation`, `ReceiptSize`, `FlashArticleCategory`, `OrderShipmentStatus`, `OrderStatus`, `OrderShipmentChannel`, `StoreBillingType`, `StoreCodType`, `UserRole`, `PriceInfoDescription`, `PlanDetailRegion` and `PlanDetailType` are exported both as runtime objects and as union types:

```ts
import { OrderShipmentStatus } from '@th-postway/post-sdk';
if (parcel.order_shipment_status === OrderShipmentStatus.InTransit) {
  /* 'In-Transit' */
}
```

## Errors

All errors extend `PostwayError`.

| Class                                                | When                                                      | Useful fields                                           |
| ---------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| `PostwayApiError`                                    | Non-2xx response                                          | `status`, `code`, `messages[]`, `body`, `method`, `url` |
| `PostwayBusinessError` _(extends `PostwayApiError`)_ | 2xx response whose envelope says `isSuccess: false`       | same                                                    |
| `PostwayRequestError`                                | Network failure, abort or timeout; nothing came back      | `cause`, `method`, `url`                                |
| `PostwayConfigError`                                 | Invalid client options, or a guarded call without a token | —                                                       |

The server reports errors as `{ code, isSuccess: false, message, data: null }` with the real HTTP status:

| HTTP | Meaning                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------- |
| 400  | Validation failure (`messages` may hold several entries) or business rule, e.g. order not found |
| 403  | Missing, unknown or expired token                                                               |
| 404  | Public receipt token invalid                                                                    |
| 500  | Server error; `messages` is a generic text                                                      |

`code` in the body is **400 or 500**, not the HTTP status. Use `status` to branch.

`orderShipments.create` and `cancel` can fail **with HTTP 201** and `isSuccess: false`, for example when verification or the courier rejects the parcel. The SDK turns that into `PostwayBusinessError`, so a resolved promise always means success.

```ts
import { PostwayApiError, PostwayBusinessError } from '@th-postway/post-sdk';

try {
  await postway.orderShipments.cancel('TH0001');
} catch (error) {
  if (error instanceof PostwayBusinessError) console.warn('refused:', error.messages);
  else if (error instanceof PostwayApiError && error.status === 403) console.warn('token expired');
  else throw error;
}
```

## Labels and receipt files

Label and receipt endpoints return JSON, not raw bytes:

```ts
interface FileHttpResponse {
  file_name: string;
  content: string /* base64 */;
  content_type: string;
  content_length: number;
}
```

`decodeFile(file)` returns a `Buffer`.

## Units and conventions

- Weight is in **grams**. Width, length and height are in **cm**. Money is in **THB**.
- COD amount = Σ `price_per_item × amount` over `product_cods`. An empty array means a non-COD parcel.
- Timestamps arrive as ISO-8601 strings (`IsoDateString`). The exception is `PublicReceiptResponse.created_at`, which is pre-formatted `yyyy/MM/dd HH:mm:ss`.
- Field names are the wire names (`snake_case`), so payloads match the Swagger docs one to one.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit over src + test
npm test            # unit tests (vitest, mocked fetch, no network)
npm run build       # emits dist/ (ESM + .d.ts + source maps)
```

The dev toolchain (Vitest) needs Node ≥ 22.12, even though the published package runs on any Node 22.x.

Unit tests assert the exact method, URL, headers and body for every endpoint, plus error mapping, the 201 + `isSuccess:false` case, empty-body → `null`, timeouts and aborts.

Integration tests are **read-only** (ping, account info, couriers, Thailand and parcel filters, unknown tracking number → `null`, invalid token → 403). They are skipped unless both variables are set:

```bash
POSTWAY_MERCHANT_BASE_URL=https://sandbox-post.postway.co.th/merchant \
POSTWAY_MERCHANT_ACCESS_TOKEN=... \
npm run test:integration
```

They never create or cancel parcels.

The request and response types mirror the Merchant API's published schema (the original model names appear in backticks in the JSDoc). When the Merchant API changes, update `src/types/*`, the resource, and the matching test in `test/unit/resources/<resource>.test.ts`. `SDK_VERSION` in `src/core/version.ts` must equal `package.json` `version`; `test/unit/package-surface.test.ts` enforces this and snapshots the public export list, so update both deliberately.

## Mapping from the .NET SDK

| `Postway.Post` (.NET)                       | This SDK                                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Auth_AccountInfo()`                        | `auth.accountInfo()`                                                                                                                                  |
| `OrderShipment_GetByTrackingNo(trackingNo)` | `orderShipments.getByTrackingNo(trackingNo)`                                                                                                          |
| `OrderShipment_GetByRef(refNo)`             | `orderShipments.getByRef(ref)`                                                                                                                        |
| `Label_OrderShipment(request)`              | `labels.orderShipments(request)`                                                                                                                      |
| —                                           | `orderShipments.filter / create / calculatePrice / cancel`, `shipmentProviders.all`, `thailand.filter`, `labels.receipt`, `receipts.*`, `health.ping` |

Both SDKs default to `https://post.postway.co.th/merchant`.
