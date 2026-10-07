import { describe, expect, it } from 'vitest';
import { BASE_URL, TOKEN, json, only, setup } from '../support/mock-fetch.js';

const AUTH = `Bearer ${TOKEN}`;

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
