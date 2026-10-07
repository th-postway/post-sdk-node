import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PostwayApiError,
  PostwayConfigError,
  type AccessToken,
  type AccessTokenRefreshReason,
} from '../../../src/index.js';
import { BASE_URL, apiError, json, setup, text } from '../support/mock-fetch.js';

const T0 = Date.parse('2027-01-01T00:00:00.000Z');
const ACCOUNT_INFO = `${BASE_URL}/auth/account/info`;

/** Unsigned JWT with the given `iat` / `exp` (epoch ms). Only the payload matters to the SDK. */
function jwt(issuedAtMs: number, expiresAtMs: number, subject = 'shop'): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'none' })}.${part({ sub: subject, iat: issuedAtMs / 1000, exp: expiresAtMs / 1000 })}.sig`;
}

/** Provider that hands out `tokens` in order and records why it was asked. */
function provider(...tokens: (string | AccessToken)[]) {
  const reasons: AccessTokenRefreshReason[] = [];
  const getAccessToken = vi.fn((reason: AccessTokenRefreshReason) => {
    reasons.push(reason);
    const next = tokens.shift();
    if (next === undefined) throw new Error('no more tokens');
    return Promise.resolve(next);
  });
  return { getAccessToken, reasons };
}

const auth = (token: string) => `Bearer ${token}`;
const session = (expired: number) =>
  json({ store: {}, user: {}, session: { expired: new Date(expired).toISOString() } });

describe('access token refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks the provider once for the first token and reuses it (JWT: no probe)', async () => {
    const token = jwt(T0, T0 + 100_000);
    const { getAccessToken, reasons } = provider(token);
    const { client, calls } = setup([json([]), json([])], { accessToken: undefined, getAccessToken });
    await client.shipmentProviders.all();
    await client.shipmentProviders.all();
    expect(reasons).toEqual(['initial']);
    expect(calls.map(c => c.headers.Authorization)).toEqual([auth(token), auth(token)]);
    expect(calls.every(c => c.url === `${BASE_URL}/shipment-provider/all`)).toBe(true);
  });

  it('refreshes once 75% of the JWT lifetime (iat → exp) has elapsed', async () => {
    const first = jwt(T0 - 10_000, T0 + 90_000); // 100 s lifetime, 10 s gone
    const second = jwt(T0 + 65_000, T0 + 165_000);
    const { getAccessToken, reasons } = provider(first, second);
    const { client, calls } = setup([json([]), json([]), json([])], { accessToken: undefined, getAccessToken });

    await client.shipmentProviders.all();
    vi.setSystemTime(T0 + 64_999); // 74.999% elapsed
    await client.shipmentProviders.all();
    vi.setSystemTime(T0 + 65_000); // 75% elapsed
    await client.shipmentProviders.all();

    expect(reasons).toEqual(['initial', 'expiring']);
    expect(calls.map(c => c.headers.Authorization)).toEqual([auth(first), auth(first), auth(second)]);
  });

  it('uses the expiresAt the provider returns for an opaque token, without probing', async () => {
    const { getAccessToken, reasons } = provider(
      { accessToken: 'opaque_1', expiresAt: new Date(T0 + 100_000) },
      { accessToken: 'opaque_2', expiresAt: new Date(T0 + 200_000).toISOString() },
    );
    const { client, calls } = setup([json([]), json([])], { accessToken: undefined, getAccessToken });
    await client.shipmentProviders.all();
    vi.setSystemTime(T0 + 75_000);
    await client.shipmentProviders.all();
    expect(reasons).toEqual(['initial', 'expiring']);
    expect(calls.map(c => c.headers.Authorization)).toEqual([auth('opaque_1'), auth('opaque_2')]);
  });

  it('probes auth/account/info once for an opaque token and refreshes at 75% of session.expired', async () => {
    const next = jwt(T0 + 75_000, T0 + 175_000);
    const { getAccessToken, reasons } = provider(next);
    const { client, calls } = setup([session(T0 + 100_000), json([]), json([]), json([])], {
      accessToken: 'opaque_static',
      getAccessToken,
    });

    await client.shipmentProviders.all();
    await client.shipmentProviders.all();
    expect(calls.map(c => c.url)).toEqual([
      ACCOUNT_INFO,
      `${BASE_URL}/shipment-provider/all`,
      `${BASE_URL}/shipment-provider/all`,
    ]);
    expect(calls[0]).toMatchObject({ method: 'POST', headers: { Authorization: auth('opaque_static') } });
    expect(reasons).toEqual([]);

    vi.setSystemTime(T0 + 75_000);
    await client.shipmentProviders.all();
    expect(reasons).toEqual(['expiring']);
    expect(calls[3]!.headers.Authorization).toBe(auth(next));
  });

  it('learns the lifetime from the caller’s own accountInfo() without an extra probe', async () => {
    const next = jwt(T0 + 75_000, T0 + 175_000);
    const { getAccessToken, reasons } = provider(next);
    const { client, calls } = setup([session(T0 + 100_000), json([])], {
      accessToken: 'opaque_static',
      getAccessToken,
    });
    await client.auth.accountInfo();
    vi.setSystemTime(T0 + 75_000);
    await client.shipmentProviders.all();
    expect(calls).toHaveLength(2);
    expect(reasons).toEqual(['expiring']);
    expect(calls[1]!.headers.Authorization).toBe(auth(next));
  });

  it('refreshes straight away when the probe gets a 403', async () => {
    const next = jwt(T0, T0 + 100_000);
    const { getAccessToken, reasons } = provider(next);
    const { client, calls } = setup([apiError(403, 'Forbidden resource'), json([])], {
      accessToken: 'opaque_stale',
      getAccessToken,
    });
    await client.shipmentProviders.all();
    expect(reasons).toEqual(['forbidden']);
    expect(calls.map(c => [c.url, c.headers.Authorization])).toEqual([
      [ACCOUNT_INFO, auth('opaque_stale')],
      [`${BASE_URL}/shipment-provider/all`, auth(next)],
    ]);
  });

  it('carries on with the call when the probe fails for another reason', async () => {
    const { getAccessToken, reasons } = provider();
    const { client, calls } = setup([apiError(500, 'Internal server error'), json([]), json([])], {
      accessToken: 'opaque_static',
      getAccessToken,
    });
    await client.shipmentProviders.all();
    await client.shipmentProviders.all();
    expect(reasons).toEqual([]);
    expect(calls.map(c => c.url)).toEqual([
      ACCOUNT_INFO,
      `${BASE_URL}/shipment-provider/all`,
      `${BASE_URL}/shipment-provider/all`,
    ]);
  });

  it('403 → refresh → replays the call once with the new token and the same body', async () => {
    const first = jwt(T0, T0 + 100_000, 'first');
    const second = jwt(T0, T0 + 100_000, 'second');
    const { getAccessToken, reasons } = provider(first, second);
    const ok = { code: 200, isSuccess: true, message: 'ok', data: null };
    const { client, calls } = setup([apiError(403, 'Forbidden resource'), json(ok)], {
      accessToken: undefined,
      getAccessToken,
    });

    await client.orderShipments.cancel('PW1');

    expect(reasons).toEqual(['initial', 'forbidden']);
    expect(calls).toHaveLength(2);
    expect(calls.map(c => c.headers.Authorization)).toEqual([auth(first), auth(second)]);
    expect(calls[1]).toMatchObject({ method: calls[0]!.method, url: calls[0]!.url, body: { tracking_no: 'PW1' } });
    expect(calls[1]!.body).toEqual(calls[0]!.body);
  });

  it('403 → refresh → 403 throws without a third request', async () => {
    const { getAccessToken, reasons } = provider(jwt(T0, T0 + 100_000, 'a'), jwt(T0, T0 + 100_000, 'b'));
    const { client, calls } = setup([apiError(403, 'Forbidden resource'), apiError(403, 'Forbidden resource')], {
      accessToken: undefined,
      getAccessToken,
    });
    const error = (await client.shipmentProviders.all().catch((e: unknown) => e)) as PostwayApiError;
    expect(error).toBeInstanceOf(PostwayApiError);
    expect(error.status).toBe(403);
    expect(calls).toHaveLength(2);
    expect(reasons).toEqual(['initial', 'forbidden']);
  });

  it('does not replay after a 403 when the probe already used the refresh', async () => {
    const { getAccessToken, reasons } = provider('opaque_new');
    const { client, calls } = setup([apiError(403, 'Forbidden resource'), apiError(403, 'Forbidden resource')], {
      accessToken: 'opaque_stale',
      getAccessToken,
    });
    await expect(client.shipmentProviders.all()).rejects.toBeInstanceOf(PostwayApiError);
    expect(reasons).toEqual(['forbidden']);
    expect(calls).toHaveLength(2);
  });

  it('without a provider: no probe, no refresh, no replay', async () => {
    const { client, calls } = setup([apiError(403, 'Forbidden resource')], { accessToken: 'opaque_static' });
    await expect(client.shipmentProviders.all()).rejects.toBeInstanceOf(PostwayApiError);
    expect(calls).toHaveLength(1);
  });

  it('never probes, refreshes, authenticates or replays public routes', async () => {
    const { getAccessToken } = provider();
    const { client, calls } = setup([text('pong'), apiError(403, 'Forbidden resource')], {
      accessToken: undefined,
      getAccessToken,
    });
    await client.health.ping();
    await expect(client.receipts.getPublic('rcpt')).rejects.toBeInstanceOf(PostwayApiError);
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(calls).toHaveLength(2);
    expect(calls.every(c => c.headers.Authorization === undefined)).toBe(true);
  });

  it('shares one provider call and one probe between concurrent calls', async () => {
    let release!: (token: string) => void;
    const getAccessToken = vi.fn(() => new Promise<string>(resolve => (release = resolve)));
    const { client, calls } = setup([session(T0 + 100_000), json([]), json([]), json([])], {
      accessToken: undefined,
      getAccessToken,
    });
    const pending = Promise.all([
      client.shipmentProviders.all(),
      client.shipmentProviders.all(),
      client.shipmentProviders.all(),
    ]);
    await vi.waitFor(() => expect(getAccessToken).toHaveBeenCalled());
    release('opaque_1');
    await pending;
    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(calls.filter(c => c.url === ACCOUNT_INFO)).toHaveLength(1);
    expect(calls).toHaveLength(4);
  });

  it('rejects an unsafe token from the provider without echoing it, before any request', async () => {
    const { getAccessToken } = provider('secret\r\nX-Injected: 1');
    const { client, fetch } = setup([], { accessToken: undefined, getAccessToken });
    const error = (await client.shipmentProviders.all().catch((e: unknown) => e)) as PostwayConfigError;
    expect(error).toBeInstanceOf(PostwayConfigError);
    expect(error.message).not.toContain('secret');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects an invalid expiresAt from the provider', async () => {
    const { getAccessToken } = provider({ accessToken: 'opaque', expiresAt: 'not a date' });
    const { client, fetch } = setup([], { accessToken: undefined, getAccessToken });
    await expect(client.shipmentProviders.all()).rejects.toBeInstanceOf(PostwayConfigError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('propagates a provider error unchanged and sends nothing', async () => {
    const failure = new Error('login service down');
    const { client, fetch } = setup([], { accessToken: undefined, getAccessToken: () => Promise.reject(failure) });
    await expect(client.shipmentProviders.all()).rejects.toBe(failure);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a non-function getAccessToken at construction', () => {
    expect(() => setup([], { getAccessToken: 'token' as never })).toThrow(PostwayConfigError);
  });
});
