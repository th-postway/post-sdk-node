import { describe, expect, it, vi } from 'vitest';
import {
  MERCHANT_BASE_URLS,
  PostwayConfigError,
  PostwayMerchantClient,
  type PostwayMerchantClientOptions,
} from '../../../src/index.js';
import { json, only, setup } from '../support/mock-fetch.js';

describe('PostwayMerchantClient configuration', () => {
  const fetch = vi.fn();

  /** Construct with `options` and return the `PostwayConfigError` it throws. */
  function configError(options: PostwayMerchantClientOptions): PostwayConfigError {
    let caught: unknown;
    try {
      new PostwayMerchantClient({ fetch, ...options });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PostwayConfigError);
    return caught as PostwayConfigError;
  }

  it('defaults to the production base URL (same as the .NET SDK)', () => {
    expect(new PostwayMerchantClient({ fetch }).baseUrl).toBe('https://post.postway.co.th/merchant');
  });

  it.each(Object.entries(MERCHANT_BASE_URLS))('resolves environment %s', (environment, url) => {
    const client = new PostwayMerchantClient({ environment: environment as keyof typeof MERCHANT_BASE_URLS, fetch });
    expect(client.baseUrl).toBe(url);
  });

  it('lets an explicit baseUrl win over environment', () => {
    const client = new PostwayMerchantClient({ baseUrl: 'https://merchant.example/v1', environment: 'sandbox', fetch });
    expect(client.baseUrl).toBe('https://merchant.example/v1');
  });

  it.each([
    ['http://localhost:3000/api//', 'http://localhost:3000/api'],
    ['http://127.0.0.1:3000/api', 'http://127.0.0.1:3000/api'],
    ['http://[::1]:3000/api', 'http://[::1]:3000/api'],
    ['HTTPS://Merchant.Example/merchant/', 'https://merchant.example/merchant'],
    ['https://merchant.example', 'https://merchant.example'],
  ])('accepts baseUrl %s and normalises it to %s', (input, expected) => {
    expect(new PostwayMerchantClient({ baseUrl: input, fetch }).baseUrl).toBe(expected);
  });

  it.each([
    ['plain http to a remote host', 'http://merchant.example/merchant', 'merchant.example'],
    ['an ftp URL', 'ftp://merchant.example/merchant', 'ftp:'],
    ['a file URL', 'file:///etc/passwd', 'passwd'],
    ['a relative path', '/merchant', '/merchant'],
    ['a non-URL', 'not a url', 'not a url'],
    ['embedded credentials', 'https://user:s3cret@merchant.example/merchant', 's3cret'],
    ['a query string', 'https://merchant.example/merchant?debug=1', 'debug'],
    ['a bare question mark', 'https://merchant.example/merchant?', 'merchant.example'],
    ['a fragment', 'https://merchant.example/merchant#section-9', 'section-9'],
  ])('rejects %s as baseUrl without echoing it', (_label, baseUrl, secret) => {
    expect(configError({ baseUrl }).message).not.toContain(secret);
  });

  it('rejects an unknown environment, naming the valid ones but not the input', () => {
    const error = configError({ environment: 'qa' as never });
    expect(error.message).toMatch(/production, sandbox/);
    expect(error.message).not.toMatch(/qa/);
  });

  it.each([
    ['accessToken with CRLF', { accessToken: 'tok\r\nX-Injected: 1' }, 'X-Injected'],
    ['tokenType with a newline', { tokenType: 'Bearer\n' }, 'Bearer\n'],
    ['tokenType with a space', { tokenType: 'Bearer x' }, 'Bearer x'],
    ['userAgent with a NUL byte', { userAgent: 'ua\u0000' }, 'ua\u0000'],
    ['non-ASCII userAgent', { userAgent: 'ร้าน/1.0' }, 'ร้าน'],
    ['empty userAgent', { userAgent: '' }, 'undefined'],
  ])('rejects header injection via %s at construction', (_label, options, secret) => {
    expect(configError(options).message).not.toContain(secret);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2_147_483_648, '60000' as never])(
    'rejects timeoutMs %s',
    timeoutMs => {
      const error = configError({ timeoutMs });
      expect(error.message).toMatch(/timeoutMs must be a positive integer/);
      expect(error.message).not.toContain('1.5');
      expect(error.message).not.toContain('60000');
    },
  );

  it('requires fetch to be a function', () => {
    configError({ fetch: {} as never });
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
