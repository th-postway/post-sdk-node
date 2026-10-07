import { PostwayConfigError } from './errors.js';

/** Largest delay `AbortSignal.timeout` accepts (2^31 - 1 ms). */
export const MAX_TIMEOUT_MS = 2_147_483_647;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
/** Non-empty printable ASCII: what every HTTP stack accepts as a header value without complaint. */
const HEADER_VALUE = /^[\x20-\x7E]+$/;
/** RFC 9110 `token`: the auth-scheme part of `Authorization`. */
const AUTH_SCHEME = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;

/**
 * Validate and normalise a base URL: absolute, `https:` (or `http:` to a loopback host), no
 * credentials, query or fragment. Returns the canonical form without trailing slashes.
 *
 * Messages never include the offending value, so they are safe to log.
 */
export function normalizeBaseUrl(raw: unknown): string {
  if (typeof raw !== 'string' || !URL.canParse(raw)) {
    throw new PostwayConfigError('baseUrl must be an absolute URL');
  }
  const url = new URL(raw);
  const loopbackHttp = url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !loopbackHttp) {
    throw new PostwayConfigError('baseUrl must use https:// (http:// is only allowed for localhost)');
  }
  if (url.username || url.password) {
    throw new PostwayConfigError('baseUrl must not contain credentials');
  }
  if (url.search || url.hash || raw.includes('?') || raw.includes('#')) {
    throw new PostwayConfigError('baseUrl must not contain a query string or fragment');
  }
  return url.href.replace(/\/+$/, '');
}

/** A positive integer number of milliseconds that `AbortSignal.timeout` accepts. */
export function assertTimeoutMs(value: unknown, name = 'timeoutMs'): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || value > MAX_TIMEOUT_MS) {
    throw new PostwayConfigError(
      `${name} must be a positive integer number of milliseconds (at most ${MAX_TIMEOUT_MS})`,
    );
  }
}

/** A value that can go on the wire as an HTTP header without being rejected or injecting headers. */
export function assertHeaderValue(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || !HEADER_VALUE.test(value)) {
    throw new PostwayConfigError(
      `${name} must be a non-empty string of printable ASCII characters (no line breaks or control characters)`,
    );
  }
}

/** The scheme word of `Authorization`, e.g. `Bearer`. */
export function assertAuthScheme(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !AUTH_SCHEME.test(value)) {
    throw new PostwayConfigError('tokenType must be a single HTTP authentication scheme token such as "Bearer"');
  }
}

/** A path segment that cannot change which route the request reaches. */
export function assertPathSegment(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || value === '' || value === '.' || value === '..') {
    throw new PostwayConfigError(`${name} must be a non-empty string other than "." or ".."`);
  }
}
