import { describe, expect, it } from 'vitest';
import {
  FlashArticleCategory,
  type MerchantOrderShipmentCreateRequest,
  type MerchantOrderShipmentData,
} from '../../../src/index.js';
import { BASE_URL, TOKEN, empty, json, only, setup } from '../support/mock-fetch.js';

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
