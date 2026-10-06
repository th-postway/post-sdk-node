/**
 * Public Merchant API base URLs.
 *
 * The cluster ingress rewrites `/merchant/<path>` to the service's `/api/<path>`, so public URLs
 * have no `/api` segment. `local` points straight at a `nest start merchant` process (port
 * `MERCHANT_PORT`, default 3000), which is why it ends in `/api`.
 */
export const MERCHANT_BASE_URLS = {
  production: 'https://post.postway.co.th/merchant',
  staging: 'https://post.postway.co.th/merchant/stg',
  development: 'https://post.postway.co.th/merchant/dev',
  /** Sandbox host, backed by the development deployment. */
  sandbox: 'https://sandbox-post.postway.co.th/merchant',
  local: 'http://localhost:3000/api',
} as const;

export type MerchantEnvironment = keyof typeof MERCHANT_BASE_URLS;
