import { describe, expect, it } from 'vitest';
import { PostwayApiError } from '../../../src/index.js';
import { BASE_URL, json, only, setup, text } from '../support/mock-fetch.js';

describe('receipts (public, no token)', () => {
  it('getPublic → GET receipt/public/:token without Authorization', async () => {
    const receipt = { is_available: true, no: 'RC-001', shipments: [] };
    const { client, calls } = setup([json(receipt)], { accessToken: undefined });
    await expect(client.receipts.getPublic('abc.def')).resolves.toEqual(receipt);
    expect(only(calls)).toMatchObject({ method: 'GET', url: `${BASE_URL}/receipt/public/abc.def` });
    expect(calls[0]!.headers).not.toHaveProperty('Authorization');
  });

  it('getPublic throws PostwayApiError 404 for a bad token', async () => {
    const { client } = setup([json({ code: 400, isSuccess: false, message: 'ไม่พบใบเสร็จ', data: null }, 404)]);
    await expect(client.receipts.getPublic('bad')).rejects.toMatchObject({ status: 404 });
  });

  it('getPublicHtml → GET receipt/:token as text; a 404 page becomes PostwayApiError with the HTML body', async () => {
    const { client, calls } = setup([text('<html>ok</html>'), text('<html>ไม่พบ</html>', 404)]);
    await expect(client.receipts.getPublicHtml('tok')).resolves.toBe('<html>ok</html>');
    const error = (await client.receipts.getPublicHtml('bad').catch((e: unknown) => e)) as PostwayApiError;
    expect(error).toBeInstanceOf(PostwayApiError);
    expect(error.body).toBe('<html>ไม่พบ</html>');
    expect(calls[0]!.url).toBe(`${BASE_URL}/receipt/tok`);
    expect(calls[0]!.headers).not.toHaveProperty('Authorization');
  });

  it('publicUrl builds the QR link without a request', () => {
    const { client, fetch } = setup();
    expect(client.receipts.publicUrl('a/b')).toBe(`${BASE_URL}/receipt/a%2Fb`);
    expect(fetch).not.toHaveBeenCalled();
  });
});
