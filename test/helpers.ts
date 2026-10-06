import { vi } from 'vitest';
import { PostwayMerchantClient, type PostwayMerchantClientOptions } from '../src/index.js';

export const BASE_URL = 'https://merchant.test/merchant';
export const TOKEN = 'tok_123';

export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

/** JSON response the way Nest/Express sends it. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** Empty body — what Nest sends when a handler returns `null`. */
export function empty(status = 200): Response {
  return new Response(null, { status });
}

export function text(body: string, status = 200, contentType = 'text/html; charset=utf-8'): Response {
  return new Response(body, { status, headers: { 'content-type': contentType } });
}

/** The error body produced by post-api's AllExceptionsFilter. */
export function apiError(status: number, message: string | string[], code = status === 500 ? 500 : 400): Response {
  return json({ code, isSuccess: false, message, data: null }, status);
}

/** A client wired to a mocked fetch that answers with `responses` in order. */
export function setup(responses: Response[] = [], options: PostwayMerchantClientOptions = {}) {
  const calls: RecordedCall[] = [];
  const queue = [...responses];
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      headers: { ...(init.headers as Record<string, string>) },
      body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
    });
    const next = queue.shift();
    if (!next) throw new Error(`unexpected request ${init.method} ${url}`);
    return next;
  });
  const client = new PostwayMerchantClient({ baseUrl: BASE_URL, accessToken: TOKEN, fetch, ...options });
  return { client, calls, fetch };
}

/** First recorded call; fails the test if nothing was sent. */
export function only(calls: RecordedCall[]): RecordedCall {
  if (calls.length !== 1) throw new Error(`expected exactly 1 request, got ${calls.length}`);
  return calls[0]!;
}
