import { PostwayApiError, PostwayBusinessError, PostwayConfigError, PostwayRequestError } from './errors.js';
import type { HttpBaseResponse } from '../types/common.js';
import { SDK_VERSION } from './version.js';

/** Per-call options accepted by every SDK method. */
export interface RequestOptions {
  /** Abort the call early. Combined with the timeout. */
  signal?: AbortSignal;
  /** Override the client's `timeoutMs` for this call. */
  timeoutMs?: number;
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface HttpClientConfig {
  baseUrl: string;
  accessToken?: string;
  tokenType: string;
  timeoutMs: number;
  fetch: FetchLike;
  userAgent: string;
}

/** Describes one HTTP call relative to the base URL. */
export interface HttpCall extends RequestOptions {
  method: 'GET' | 'POST';
  /** Path segments; each is URL-encoded and joined with `/`. */
  path: readonly string[];
  query?: Record<string, string | undefined>;
  body?: unknown;
  /** Send `Authorization` (MerchantGuard routes). */
  auth: boolean;
}

export const DEFAULT_TIMEOUT_MS = 60_000;

export function defaultUserAgent(): string {
  return `postway-sdk-node/${SDK_VERSION} node/${process.version}`;
}

/** Thin `fetch` wrapper: URL building, headers, timeout, body parsing and error mapping. */
export class HttpClient {
  readonly #config: HttpClientConfig;

  constructor(config: HttpClientConfig) {
    this.#config = { ...config, baseUrl: config.baseUrl.replace(/\/+$/, '') };
  }

  get baseUrl(): string {
    return this.#config.baseUrl;
  }

  /** Absolute URL for a call (path segments encoded, empty query values dropped). */
  url(path: readonly string[], query?: Record<string, string | undefined>): string {
    const url = `${this.#config.baseUrl}/${path.map(encodeURIComponent).join('/')}`;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== '') params.append(key, value);
    }
    const search = params.toString();
    return search ? `${url}?${search}` : url;
  }

  /** Perform the call and return the parsed body (`null` for an empty body). */
  async request<T>(call: HttpCall): Promise<T> {
    return (await this.#sendChecked(call)).body as T;
  }

  /**
   * Perform a call whose response is an `HttpBaseResponse<T>` envelope and return `data`.
   * A 2xx envelope with `isSuccess: false` throws `PostwayBusinessError`.
   */
  async requestEnvelope<T>(call: HttpCall): Promise<T> {
    const { status, body, url } = await this.#sendChecked(call);
    if (!isEnvelope(body)) {
      throw new PostwayApiError(
        { method: call.method, url, status, messages: [], body },
        'Unexpected response: expected { code, isSuccess, message, data }',
      );
    }
    if (body.isSuccess === false) {
      throw new PostwayBusinessError({ method: call.method, url, status, ...describeBody(body), body });
    }
    return body.data as T;
  }

  /** `#send`, throwing `PostwayApiError` for a non-2xx status. */
  async #sendChecked(call: HttpCall): Promise<{ status: number; body: unknown; url: string }> {
    const result = await this.#send(call);
    if (result.status < 200 || result.status >= 300) {
      throw new PostwayApiError({ method: call.method, ...result, ...describeBody(result.body) });
    }
    return result;
  }

  async #send(call: HttpCall): Promise<{ status: number; body: unknown; url: string }> {
    const url = this.url(call.path, call.query);
    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
      'User-Agent': this.#config.userAgent,
    };
    if (call.auth) {
      if (!this.#config.accessToken) {
        throw new PostwayConfigError(
          `${call.method} ${call.path.join('/')} requires a merchant access token; pass accessToken to the client`,
        );
      }
      headers.Authorization = `${this.#config.tokenType} ${this.#config.accessToken}`;
    }
    let payload: string | undefined;
    if (call.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(call.body);
    }

    const timeoutMs = call.timeoutMs ?? this.#config.timeoutMs;
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = call.signal ? AbortSignal.any([call.signal, timeout]) : timeout;

    let response: Response;
    try {
      const init: RequestInit = { method: call.method, headers, signal };
      if (payload !== undefined) init.body = payload;
      response = await this.#config.fetch(url, init);
    } catch (error) {
      throw toRequestError(call.method, url, error, timeout.aborted ? timeoutMs : undefined);
    }

    let text: string;
    try {
      text = await response.text();
    } catch (error) {
      throw toRequestError(call.method, url, error, timeout.aborted ? timeoutMs : undefined);
    }
    return { status: response.status, body: parseBody(text, response.headers.get('content-type')), url };
  }
}

function parseBody(text: string, contentType: string | null): unknown {
  if (text.length === 0) return null;
  if (contentType?.includes('json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function isEnvelope(value: unknown): value is HttpBaseResponse<unknown> {
  return typeof value === 'object' && value !== null && 'isSuccess' in value;
}

function describeBody(body: unknown): { code?: number; messages: string[] } {
  if (typeof body === 'string') return { messages: body ? [body] : [] };
  if (typeof body !== 'object' || body === null) return { messages: [] };
  const { code, message } = body as { code?: unknown; message?: unknown };
  const messages = Array.isArray(message)
    ? message.map(String)
    : typeof message === 'string' && message
      ? [message]
      : [];
  return typeof code === 'number' ? { code, messages } : { messages };
}

function toRequestError(method: string, url: string, error: unknown, timedOutAfterMs?: number): PostwayRequestError {
  if (timedOutAfterMs !== undefined) {
    return new PostwayRequestError(method, url, `${method} ${url} timed out after ${timedOutAfterMs} ms`, { cause: error });
  }
  const reason = error instanceof Error ? error.message : String(error);
  return new PostwayRequestError(method, url, `${method} ${url} failed: ${reason}`, { cause: error });
}
