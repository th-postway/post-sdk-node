import { describe, expect, it } from 'vitest';
import { BASE_URL, json, setup } from '../support/mock-fetch.js';

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
