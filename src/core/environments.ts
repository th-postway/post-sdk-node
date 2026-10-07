/**
 * Public Merchant API base URLs. Pass `baseUrl` to `PostwayMerchantClient` for any other host.
 */
export const MERCHANT_BASE_URLS = {
  production: 'https://post.postway.co.th/merchant',
  /** Sandbox environment for integration testing. */
  sandbox: 'https://sandbox-post.postway.co.th/merchant',
} as const;

export type MerchantEnvironment = keyof typeof MERCHANT_BASE_URLS;
