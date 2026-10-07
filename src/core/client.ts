import { MERCHANT_BASE_URLS, type MerchantEnvironment } from './environments.js';
import { PostwayConfigError } from './errors.js';
import { DEFAULT_TIMEOUT_MS, defaultUserAgent, HttpClient, type FetchLike } from './http-client.js';
import { AuthResource } from '../resources/auth.js';
import { HealthResource } from '../resources/health.js';
import { LabelsResource } from '../resources/labels.js';
import { OrderShipmentsResource } from '../resources/order-shipments.js';
import { ReceiptsResource } from '../resources/receipts.js';
import { ShipmentProvidersResource } from '../resources/shipment-providers.js';
import { ThailandResource } from '../resources/thailand.js';

export interface PostwayMerchantClientOptions {
  /**
   * Merchant session access token, issued to you by Postway. Required for every call except
   * `receipts.*` and `health.ping()`.
   */
  accessToken?: string;
  /** Token type sent before the token in `Authorization`. Default `"Bearer"`. */
  tokenType?: string;
  /**
   * Full API base URL; overrides `environment`. Must be `https://` (plain `http://` is accepted
   * only for localhost) with no credentials, query string or fragment.
   */
  baseUrl?: string;
  /** Named Postway environment. Default `"production"`. Ignored when `baseUrl` is set. */
  environment?: MerchantEnvironment;
  /** Per-request timeout in milliseconds. Default 60 000. */
  timeoutMs?: number;
  /** `fetch` implementation. Default `globalThis.fetch`. */
  fetch?: FetchLike;
  /** `User-Agent` header. Default `postway-sdk-node/<version> node/<version>`. */
  userAgent?: string;
}

/**
 * Client for the Postway Merchant API.
 *
 * The constructor validates every option and throws `PostwayConfigError` without echoing the
 * offending value, so construction failures are safe to log.
 *
 * ```ts
 * const postway = new PostwayMerchantClient({ accessToken: process.env.POSTWAY_ACCESS_TOKEN });
 * const account = await postway.auth.accountInfo();
 * ```
 */
export class PostwayMerchantClient {
  readonly auth: AuthResource;
  readonly orderShipments: OrderShipmentsResource;
  readonly shipmentProviders: ShipmentProvidersResource;
  readonly thailand: ThailandResource;
  readonly labels: LabelsResource;
  readonly receipts: ReceiptsResource;
  readonly health: HealthResource;
  /** Resolved base URL, without a trailing slash. */
  readonly baseUrl: string;

  constructor(options: PostwayMerchantClientOptions = {}) {
    const environment = options.environment ?? 'production';
    const baseUrl = options.baseUrl ?? MERCHANT_BASE_URLS[environment];
    if (!baseUrl) {
      throw new PostwayConfigError(
        `environment must be one of: ${Object.keys(MERCHANT_BASE_URLS).join(', ')} (or pass baseUrl)`,
      );
    }
    const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!fetchImpl) {
      throw new PostwayConfigError('No fetch implementation available; use Node.js >= 22.12 or pass options.fetch');
    }
    if (typeof fetchImpl !== 'function') {
      throw new PostwayConfigError('fetch must be a function');
    }

    const http = new HttpClient({
      baseUrl,
      ...(options.accessToken ? { accessToken: options.accessToken } : {}),
      tokenType: options.tokenType ?? 'Bearer',
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      fetch: fetchImpl,
      userAgent: options.userAgent ?? defaultUserAgent(),
    });

    this.baseUrl = http.baseUrl;
    this.auth = new AuthResource(http);
    this.orderShipments = new OrderShipmentsResource(http);
    this.shipmentProviders = new ShipmentProvidersResource(http);
    this.thailand = new ThailandResource(http);
    this.labels = new LabelsResource(http);
    this.receipts = new ReceiptsResource(http);
    this.health = new HealthResource(http);
  }
}
