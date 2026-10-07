import { describe, expect, it } from 'vitest';
import { BASE_URL, only, setup, text } from '../support/mock-fetch.js';

describe('health', () => {
  it('ping → GET health/ping without Authorization', async () => {
    const { client, calls } = setup([text('pong')]);
    await expect(client.health.ping()).resolves.toBe('pong');
    expect(only(calls)).toMatchObject({ method: 'GET', url: `${BASE_URL}/health/ping` });
    expect(calls[0]!.headers).not.toHaveProperty('Authorization');
  });
});
