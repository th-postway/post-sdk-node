import { describe, expect, it } from 'vitest';
import {
  FlashArticleCategory,
  LabelOrientation,
  LabelSize,
  PostwayApiError,
  ReceiptSize,
  decodeFile,
  type MerchantOrderShipmentCreateRequest,
  type MerchantOrderShipmentData,
} from '../src/index.js';
import { BASE_URL, TOKEN, empty, json, only, setup, text } from './helpers.js';

const AUTH = `Bearer ${TOKEN}`;

const shipment: MerchantOrderShipmentData = {
  channel: 'API',
  sender: {
    fullname: 'ร้านตัวอย่าง',
    mobile_phone: '0811111111',
    address: '1 ถนนสีลม',
    sub_district: 'สีลม',
    district: 'บางรัก',
    province: 'กรุงเทพมหานคร',
    zip_code: '10500',
  },
  recipient: {
    fullname: 'ลูกค้า',
    mobile_phone: '0822222222',
    address: '2 ถนนนิมมานเหมินท์',
    sub_district: 'สุเทพ',
    district: 'เมืองเชียงใหม่',
    province: 'เชียงใหม่',
    zip_code: '50200',
  },
  package: {
    width: 10,
    length: 20,
    height: 5,
    weight: 500,
    my_tracking_no: 'SHOP-1',
    tracking_no: 'TH0001',
    ref1: 'R1',
    ref2: '',
    ref3: '',
  },
  status: 'pending',
  order_shipment_status: 'Prepared',
  created_at: '2026-10-06T03:00:00.000Z',
  updated_at: null,
  in_transit_at: null,
  completed_at: null,
};

const createRequest: MerchantOrderShipmentCreateRequest = {
  shipping: { shipment_provider_name: 'Flash', my_tracking_no: 'SHOP-1' },
  sender: {
    fullname: 'ร้านตัวอย่าง',
    mobile_phone: '0811111111',
    address: '1 ถนนสีลม',
    sub_district: 'สีลม',
    district: 'บางรัก',
    province: 'กรุงเทพมหานคร',
    zip_code: '10500',
  },
  recipient: {
    fullname: 'ลูกค้า',
    mobile_phone: '0822222222',
    address: '2 ถนนนิมมานเหมินท์',
    sub_district: 'สุเทพ',
    district: 'เมืองเชียงใหม่',
    province: 'เชียงใหม่',
    zip_code: '50200',
  },
  package: { insurance_value: 0, type: FlashArticleCategory.Clothes, weight: 500, width: 10, height: 5, length: 20 },
  product_cods: [{ name: 'เสื้อ', amount: 2, price_per_item: 150 }],
};

describe('auth', () => {
  it('accountInfo → POST auth/account/info with the bearer token and no body', async () => {
    const info = {
      store: { code: 'S1', name: 'Shop' },
      user: { username: 'owner' },
      session: { expired: '2027-01-01T00:00:00.000Z' },
    };
    const { client, calls } = setup([json(info, 201)]);
    await expect(client.auth.accountInfo()).resolves.toEqual(info);
    const call = only(calls);
    expect(call).toMatchObject({ method: 'POST', url: `${BASE_URL}/auth/account/info`, body: undefined });
    expect(call.headers.Authorization).toBe(AUTH);
  });
});

describe('orderShipments', () => {
  it('getByTrackingNo → GET get-by-tracking-no/:tracking_no', async () => {
    const { client, calls } = setup([json(shipment)]);
    await expect(client.orderShipments.getByTrackingNo('TH0001')).resolves.toEqual(shipment);
    expect(only(calls)).toMatchObject({ method: 'GET', url: `${BASE_URL}/order-shipment/get-by-tracking-no/TH0001` });
    expect(calls[0]!.headers.Authorization).toBe(AUTH);
  });

  it.each([
    ['empty body (what Nest sends for null)', () => empty()],
    ['JSON null', () => json(null)],
  ])('getByTrackingNo resolves null on %s', async (_label, response) => {
    const { client } = setup([response()]);
    await expect(client.orderShipments.getByTrackingNo('NOPE')).resolves.toBeNull();
  });

  it('getByRef → GET get-by-ref/:ref, null when not found', async () => {
    const { client, calls } = setup([json(shipment), empty()]);
    await expect(client.orderShipments.getByRef('R1')).resolves.toEqual(shipment);
    await expect(client.orderShipments.getByRef('R404')).resolves.toBeNull();
    expect(calls.map(c => c.url)).toEqual([
      `${BASE_URL}/order-shipment/get-by-ref/R1`,
      `${BASE_URL}/order-shipment/get-by-ref/R404`,
    ]);
  });

  it('filter → POST order-shipment/filter with the paging body', async () => {
    const page = { count: 1, limit: 20, page: 1, page_count: 1, data: [shipment] };
    const { client, calls } = setup([json(page, 201)]);
    await expect(client.orderShipments.filter({ filter: 'TH00', page: 1, limit: 20 })).resolves.toEqual(page);
    expect(only(calls)).toMatchObject({
      method: 'POST',
      url: `${BASE_URL}/order-shipment/filter`,
      body: { filter: 'TH00', page: 1, limit: 20 },
      headers: { 'Content-Type': 'application/json', Authorization: AUTH },
    });
  });

  it('create → POST order-shipment/create with an array body and unwraps data', async () => {
    const { client, calls } = setup([json({ code: 200, isSuccess: true, message: 'ok', data: [shipment] }, 201)]);
    await expect(client.orderShipments.create([createRequest])).resolves.toEqual([shipment]);
    expect(only(calls)).toMatchObject({
      method: 'POST',
      url: `${BASE_URL}/order-shipment/create`,
      body: [createRequest],
    });
  });

  it('create wraps a single request into the array the server expects', async () => {
    const { client, calls } = setup([json({ code: 200, isSuccess: true, message: 'ok', data: [shipment] }, 201)]);
    await client.orderShipments.create(createRequest);
    expect(only(calls).body).toEqual([createRequest]);
  });

  it('calculatePrice → POST order-shipment/calculate-price', async () => {
    const quote = {
      price_infos: [{ description: 'ค่าขนส่ง', price: 35, cost: 25, cashback_cost: 0, is_reward_cashback: false, total_affliliate: 0 }],
      plan_detail: { region: 'UPC', type: 'weight', min_boundary: 0, max_boundary: 1000 },
    };
    const request = {
      shipment_name: 'Flash',
      r_sub_district: 'สุเทพ',
      r_district: 'เมืองเชียงใหม่',
      r_province: 'เชียงใหม่',
      r_zip_code: '50200',
      p_weight: 500,
      p_width: 10,
      p_height: 5,
      p_length: 20,
      p_cod: 300,
      p_insurance: 0,
    };
    const { client, calls } = setup([json(quote, 201)]);
    await expect(client.orderShipments.calculatePrice(request)).resolves.toEqual(quote);
    expect(only(calls)).toMatchObject({ method: 'POST', url: `${BASE_URL}/order-shipment/calculate-price`, body: request });
  });

  it('cancel → POST order-shipment/cancel with { tracking_no }', async () => {
    const { client, calls } = setup([json({ code: 200, isSuccess: true, message: 'ok', data: null }, 201)]);
    await expect(client.orderShipments.cancel('TH0001')).resolves.toBeUndefined();
    expect(only(calls)).toMatchObject({
      method: 'POST',
      url: `${BASE_URL}/order-shipment/cancel`,
      body: { tracking_no: 'TH0001' },
    });
  });
});

describe('shipmentProviders', () => {
  it('all → GET shipment-provider/all', async () => {
    const providers = [{ name: 'Flash', display_name: 'Flash Express' }];
    const { client, calls } = setup([json(providers)]);
    await expect(client.shipmentProviders.all()).resolves.toEqual(providers);
    expect(only(calls)).toMatchObject({ method: 'GET', url: `${BASE_URL}/shipment-provider/all` });
    expect(calls[0]!.headers.Authorization).toBe(AUTH);
  });
});

describe('thailand', () => {
  it('filter → POST thailand/filter and always sends shipment_provider_names', async () => {
    const page = { count: 0, limit: 10, page: 1, page_count: 0, data: [] };
    const { client, calls } = setup([json(page, 201), json(page, 201)]);
    await client.thailand.filter({ page: 1, limit: 10, zip_code: '50200' });
    await client.thailand.filter({ page: 1, limit: 10, shipment_provider_names: ['Flash'] });
    expect(calls[0]).toMatchObject({
      method: 'POST',
      url: `${BASE_URL}/thailand/filter`,
      body: { page: 1, limit: 10, zip_code: '50200', shipment_provider_names: [] },
    });
    expect(calls[1]!.body).toMatchObject({ shipment_provider_names: ['Flash'] });
  });
});

describe('labels', () => {
  const file = { file_name: 'label.pdf', content: Buffer.from('%PDF-1.7').toString('base64'), content_type: 'application/pdf', content_length: 8 };

  it('orderShipments → POST label/order/shipments, decodable with decodeFile', async () => {
    const { client, calls } = setup([json(file, 201)]);
    const request = { tracking_nos: ['TH0001', 'SHOP-2'], label_size: LabelSize.Size4x6, label_orientation: LabelOrientation.Portrait };
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

describe('health', () => {
  it('ping → GET health/ping without Authorization', async () => {
    const { client, calls } = setup([text('pong')]);
    await expect(client.health.ping()).resolves.toBe('pong');
    expect(only(calls)).toMatchObject({ method: 'GET', url: `${BASE_URL}/health/ping` });
    expect(calls[0]!.headers).not.toHaveProperty('Authorization');
  });
});
