import { describe, expect, it } from 'vitest';
import { BASE_URL, TOKEN, json, only, setup } from '../support/mock-fetch.js';

const AUTH = `Bearer ${TOKEN}`;

describe('shipmentProviders', () => {
  it('all → GET shipment-provider/all', async () => {
    const providers = [{ name: 'Flash', display_name: 'Flash Express' }];
    const { client, calls } = setup([json(providers)]);
    await expect(client.shipmentProviders.all()).resolves.toEqual(providers);
    expect(only(calls)).toMatchObject({ method: 'GET', url: `${BASE_URL}/shipment-provider/all` });
    expect(calls[0]!.headers.Authorization).toBe(AUTH);
  });
});
