import { describe, expect, it } from 'vitest';
import {
  PostwayApiError,
  PostwayBusinessError,
  PostwayConfigError,
  PostwayMerchantClient,
  PostwayRequestError,
} from '../../../src/index.js';
import { BASE_URL, apiError, json, only, setup, text } from '../support/mock-fetch.js';

/** A fetch that never resolves and rejects with the abort reason once the signal fires. */
const hanging = (_url: string, init: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });

describe('HTTP layer', () => {
  it('encodes path parameters', async () => {
    const { client, calls } = setup([json(null)]);
    await client.orderShipments.getByRef('A/B ?#1');
    expect(only(calls).url).toBe(`${BASE_URL}/order-shipment/get-by-ref/A%2FB%20%3F%231`);
  });

  it('keeps dots inside a path parameter', async () => {
    const { client, calls } = setup([json({})], { accessToken: undefined });
    await client.receipts.getPublic('abc.def');
    expect(only(calls).url).toBe(`${BASE_URL}/receipt/public/abc.def`);
  });

  it.each([
    ['an empty string', ''],
    ['"."', '.'],
    ['".."', '..'],
  ])('rejects %s as a path parameter before any request', async (_label, value) => {
    const { client, fetch } = setup();
    await expect(client.orderShipments.getByRef(value)).rejects.toBeInstanceOf(PostwayConfigError);
    await expect(client.orderShipments.getByTrackingNo(value)).rejects.toBeInstanceOf(PostwayConfigError);
    await expect(client.labels.receipt(value)).rejects.toBeInstanceOf(PostwayConfigError);
    await expect(client.receipts.getPublic(value)).rejects.toBeInstanceOf(PostwayConfigError);
    await expect(client.receipts.getPublicHtml(value)).rejects.toBeInstanceOf(PostwayConfigError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('publicUrl rejects ".." synchronously', () => {
    const { client } = setup();
    expect(() => client.receipts.publicUrl('..')).toThrow(PostwayConfigError);
  });

  it('sets Content-Type only when there is a body', async () => {
    const { client, calls } = setup([json({}), json([])]);
    await client.auth.accountInfo();
    await client.shipmentProviders.all();
    expect(calls[0]!.headers).not.toHaveProperty('Content-Type');
    expect(calls[0]!.body).toBeUndefined();
    expect(calls[1]!.headers).not.toHaveProperty('Content-Type');
  });

  it('refuses to follow redirects', async () => {
    const { client, calls } = setup([text('pong')]);
    await client.health.ping();
    expect(only(calls).redirect).toBe('error');
  });

  it('refuses a guarded call without an access token, before any request', async () => {
    const { client, fetch } = setup([], { accessToken: undefined });
    const error = (await client.auth.accountInfo().catch((e: unknown) => e)) as PostwayConfigError;
    expect(error).toBeInstanceOf(PostwayConfigError);
    expect(error.message).toMatch(/^POST auth\/account\/info requires a merchant access token/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'ไม่พบคำสั่งซื้อ', 400],
    [403, 'Forbidden resource', 400],
    [404, 'not found', 400],
    [500, 'เกิดข้อผิดพลาดในระบบ', 500],
  ])('maps HTTP %i to PostwayApiError with status, code and message', async (status, message, code) => {
    const { client } = setup([apiError(status, message)]);
    const error = await client.shipmentProviders.all().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PostwayApiError);
    expect(error).not.toBeInstanceOf(PostwayBusinessError);
    expect(error).toMatchObject({
      status,
      code,
      messages: [message],
      message,
      method: 'GET',
      url: `${BASE_URL}/shipment-provider/all`,
    });
  });

  it('keeps every validation message', async () => {
    const { client } = setup([apiError(400, ['limit must not be less than 1', 'page should not be empty'])]);
    const error = (await client.orderShipments
      .filter({ page: 0, limit: 0 })
      .catch((e: unknown) => e)) as PostwayApiError;
    expect(error.messages).toEqual(['limit must not be less than 1', 'page should not be empty']);
    expect(error.message).toBe('limit must not be less than 1; page should not be empty');
  });

  it('handles a non-JSON error body', async () => {
    const { client } = setup([text('<html>Bad Gateway</html>', 502)]);
    const error = (await client.shipmentProviders.all().catch((e: unknown) => e)) as PostwayApiError;
    expect(error.status).toBe(502);
    expect(error.body).toBe('<html>Bad Gateway</html>');
    expect(error.code).toBeUndefined();
  });

  it('keeps the response body readable but non-enumerable', async () => {
    const body = { code: 400, isSuccess: false, message: 'ไม่พบคำสั่งซื้อ', data: null, trace: 'internal-detail' };
    const { client } = setup([json(body, 400)]);
    const error = (await client.shipmentProviders.all().catch((e: unknown) => e)) as PostwayApiError;
    expect(error.body).toEqual(body);
    expect(Object.keys(error)).not.toContain('body');
    expect(JSON.stringify(error)).not.toContain('internal-detail');
  });

  it('reports the route template instead of the receipt token in API errors', async () => {
    const { client } = setup([apiError(404, 'ไม่พบใบเสร็จ')], { accessToken: undefined });
    const error = (await client.receipts.getPublic('secret-token').catch((e: unknown) => e)) as PostwayApiError;
    expect(error.url).toBe(`${BASE_URL}/receipt/public/:token`);
    expect(error.message).not.toContain('secret-token');
    expect(JSON.stringify(error)).not.toContain('secret-token');
  });

  it('reports the route template for tracking-number lookups', async () => {
    const { client } = setup([apiError(400, 'ไม่พบคำสั่งซื้อ')]);
    const error = (await client.orderShipments.getByTrackingNo('TH0001').catch((e: unknown) => e)) as PostwayApiError;
    expect(error.url).toBe(`${BASE_URL}/order-shipment/get-by-tracking-no/:tracking_no`);
    expect(JSON.stringify(error)).not.toContain('TH0001');
  });

  it('turns a 2xx envelope with isSuccess:false into PostwayBusinessError', async () => {
    const { client } = setup([json({ code: 400, isSuccess: false, message: 'ยอดเงินไม่พอ', data: null }, 201)]);
    const error = await client.orderShipments.cancel('TH1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PostwayBusinessError);
    expect(error).toMatchObject({ status: 201, code: 400, messages: ['ยอดเงินไม่พอ'] });
  });

  it('rejects a 2xx response that is not an envelope where one is expected', async () => {
    const { client } = setup([json([1, 2])]);
    await expect(client.orderShipments.cancel('TH1')).rejects.toThrow(/expected \{ code, isSuccess/);
  });

  it('wraps network failures in PostwayRequestError with the cause and a redacted URL', async () => {
    const cause = new TypeError('fetch failed');
    const client = new PostwayMerchantClient({
      baseUrl: BASE_URL,
      fetch: async () => {
        throw cause;
      },
    });
    const error = (await client.receipts.getPublic('secret-token').catch((e: unknown) => e)) as PostwayRequestError;
    expect(error).toBeInstanceOf(PostwayRequestError);
    expect(error.cause).toBe(cause);
    expect(error.url).toBe(`${BASE_URL}/receipt/public/:token`);
    expect(error.message).toBe(`GET ${BASE_URL}/receipt/public/:token failed: fetch failed`);
  });

  it('times out with PostwayRequestError and a redacted URL', async () => {
    const client = new PostwayMerchantClient({ baseUrl: BASE_URL, timeoutMs: 20, fetch: hanging });
    await expect(client.receipts.getPublic('secret-token')).rejects.toThrow(
      `GET ${BASE_URL}/receipt/public/:token timed out after 20 ms`,
    );
  });

  it('honours a caller AbortSignal and a per-call timeout', async () => {
    const controller = new AbortController();
    let seen: AbortSignal | undefined;
    const client = new PostwayMerchantClient({
      baseUrl: BASE_URL,
      fetch: (url, init) => {
        seen = init.signal ?? undefined;
        return hanging(url, init);
      },
    });
    const pending = client.health.ping({ signal: controller.signal, timeoutMs: 10_000 });
    controller.abort(new Error('user cancelled'));
    const error = (await pending.catch((e: unknown) => e)) as PostwayRequestError;
    expect(error).toBeInstanceOf(PostwayRequestError);
    expect(error.message).toContain('user cancelled');
    expect(seen?.aborted).toBe(true);
  });

  it.each([0, 1.5, -1, Number.NaN])('rejects a per-call timeoutMs of %s before any request', async timeoutMs => {
    const { client, fetch } = setup();
    await expect(client.health.ping({ timeoutMs })).rejects.toBeInstanceOf(PostwayConfigError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
