import { describe, expect, it, vi } from 'vitest';
import { MERCHANT_BASE_URLS, PostwayConfigError, PostwayMerchantClient } from '../src/index.js';
import { json, only, setup } from './helpers.js';

describe('PostwayMerchantClient configuration', () => {
  const fetch = vi.fn();

  it('defaults to the production base URL (same as the .NET SDK)', () => {
    expect(new PostwayMerchantClient({ fetch }).baseUrl).toBe('https://post.postway.co.th/merchant');
  });

  it.each(Object.entries(MERCHANT_BASE_URLS))('resolves environment %s', (environment, url) => {
    const client = new PostwayMerchantClient({ environment: environment as keyof typeof MERCHANT_BASE_URLS, fetch });
    expect(client.baseUrl).toBe(url);
  });

  it('lets an explicit baseUrl win over environment and strips trailing slashes', () => {
    const client = new PostwayMerchantClient({ baseUrl: 'http://localhost:3000/api//', environment: 'staging', fetch });
    expect(client.baseUrl).toBe('http://localhost:3000/api');
  });

  it('rejects an unknown environment, a relative baseUrl and a bad timeout', () => {
    expect(() => new PostwayMerchantClient({ environment: 'qa' as never, fetch })).toThrow(PostwayConfigError);
    expect(() => new PostwayMerchantClient({ baseUrl: '/merchant', fetch })).toThrow(PostwayConfigError);
    expect(() => new PostwayMerchantClient({ timeoutMs: 0, fetch })).toThrow(PostwayConfigError);
  });

  it('uses the configured token type and user agent', async () => {
    const { client, calls } = setup([json({})], { tokenType: 'Custom', userAgent: 'my-shop/1.0' });
    await client.auth.accountInfo();
    expect(only(calls).headers).toMatchObject({ Authorization: 'Custom tok_123', 'User-Agent': 'my-shop/1.0' });
  });

  it('sends a default user agent naming the SDK and Node versions', async () => {
    const { client, calls } = setup([json({})]);
    await client.auth.accountInfo();
    expect(only(calls).headers['User-Agent']).toMatch(/^postway-sdk-node\/\d+\.\d+\.\d+ node\/v\d+/);
  });
});
