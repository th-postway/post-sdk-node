/**
 * Live, read-only checks against a real Merchant API.
 *
 *   POSTWAY_MERCHANT_BASE_URL=https://sandbox-post.postway.co.th/merchant \
 *   POSTWAY_MERCHANT_ACCESS_TOKEN=... npm run test:integration
 *
 * Skipped unless both variables are set. Never creates or cancels anything.
 */
import { describe, expect, it } from 'vitest';
import { PostwayApiError, PostwayMerchantClient } from '../../src/index.js';

const baseUrl = process.env.POSTWAY_MERCHANT_BASE_URL;
const accessToken = process.env.POSTWAY_MERCHANT_ACCESS_TOKEN;

describe.skipIf(!baseUrl || !accessToken)('Merchant API (live, read-only)', () => {
  const client = new PostwayMerchantClient({ baseUrl: baseUrl!, accessToken: accessToken! });

  it('health.ping', async () => {
    await expect(client.health.ping()).resolves.toBe('pong');
  });

  it('auth.accountInfo', async () => {
    const info = await client.auth.accountInfo();
    expect(info.store.code).toBeTruthy();
    expect(new Date(info.session.expired).getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects an invalid token with 403', async () => {
    const anonymous = new PostwayMerchantClient({ baseUrl: baseUrl!, accessToken: 'invalid-token' });
    const error = await anonymous.auth.accountInfo().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PostwayApiError);
    expect((error as PostwayApiError).status).toBe(403);
  });

  it('shipmentProviders.all', async () => {
    const providers = await client.shipmentProviders.all();
    expect(Array.isArray(providers)).toBe(true);
  });

  it('thailand.filter', async () => {
    const page = await client.thailand.filter({ page: 1, limit: 5 });
    expect(page.limit).toBe(5);
    expect(page.data.length).toBeLessThanOrEqual(5);
  });

  it('orderShipments.filter', async () => {
    const page = await client.orderShipments.filter({ page: 1, limit: 5 });
    expect(page.count).toBeGreaterThanOrEqual(0);
  });

  it('orderShipments.getByTrackingNo returns null for an unknown number', async () => {
    await expect(client.orderShipments.getByTrackingNo(`SDK-NOPE-${Date.now()}`)).resolves.toBeNull();
  });
});
