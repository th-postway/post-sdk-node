import { describe, expect, it } from 'vitest';
import { LabelOrientation, LabelSize, ReceiptSize, decodeFile } from '../../../src/index.js';
import { BASE_URL, TOKEN, json, only, setup } from '../support/mock-fetch.js';

const AUTH = `Bearer ${TOKEN}`;

describe('labels', () => {
  const file = {
    file_name: 'label.pdf',
    content: Buffer.from('%PDF-1.7').toString('base64'),
    content_type: 'application/pdf',
    content_length: 8,
  };

  it('orderShipments → POST label/order/shipments, decodable with decodeFile', async () => {
    const { client, calls } = setup([json(file, 201)]);
    const request = {
      tracking_nos: ['TH0001', 'SHOP-2'],
      label_size: LabelSize.Size4x6,
      label_orientation: LabelOrientation.Portrait,
    };
    const result = await client.labels.orderShipments(request);
    expect(only(calls)).toMatchObject({ method: 'POST', url: `${BASE_URL}/label/order/shipments`, body: request });
    expect(decodeFile(result).toString()).toBe('%PDF-1.7');
  });

  it('receipt → GET label/receipt/:receipt_no with optional receipt_size', async () => {
    const { client, calls } = setup([json(file), json(file)]);
    await client.labels.receipt('RC-001', { receiptSize: ReceiptSize.R80mm });
    await client.labels.receipt('RC-002');
    expect(calls.map(c => c.url)).toEqual([
      `${BASE_URL}/label/receipt/RC-001?receipt_size=80mm`,
      `${BASE_URL}/label/receipt/RC-002`,
    ]);
    expect(calls[0]!.headers.Authorization).toBe(AUTH);
  });
});
