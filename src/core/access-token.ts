import { Buffer } from 'node:buffer';
import { PostwayConfigError } from './errors.js';
import { assertHeaderValue } from './validation.js';

/** Why the SDK is asking for a token: none yet, ≥75% of its lifetime gone, or the API answered 403. */
export type AccessTokenRefreshReason = 'initial' | 'expiring' | 'forbidden';

/** A token from `getAccessToken`, optionally with when it stops being accepted. */
export interface AccessToken {
  accessToken: string;
  /** Expiry; when omitted the SDK reads the JWT `exp` claim or asks `auth/account/info` once. */
  expiresAt?: Date | string;
}

/**
 * Supplies a fresh merchant access token. The SDK calls it when it has no token, when ≥75% of the
 * current token's lifetime has elapsed, and once after a 403. Errors it throws propagate unchanged.
 */
export type AccessTokenProvider = (
  reason: AccessTokenRefreshReason,
) => string | AccessToken | Promise<string | AccessToken>;

/** Share of a token's lifetime after which it is refreshed before use. */
export const REFRESH_AFTER_ELAPSED = 0.75;

/** Status and parsed body of a `POST auth/account/info` sent with a given token. */
export type ProbeSession = (token: string) => Promise<{ status: number; body: unknown }>;

interface TokenState {
  readonly value: string;
  /** Epoch ms the lifetime is measured from: JWT `iat`, else when the SDK got the token. */
  startsAt: number;
  /** Epoch ms; `undefined` while unknown. */
  expiresAt: number | undefined;
  /** Lifetime known, or the one probe for this token already ran. */
  settled: boolean;
  probe?: Promise<boolean>;
}

/** Holds the current token and refreshes it through the caller's provider. */
export class AccessTokenManager {
  readonly #provider: AccessTokenProvider | undefined;
  #state: TokenState | undefined;
  #refreshing: Promise<TokenState> | undefined;

  constructor(accessToken: string | undefined, provider: AccessTokenProvider | undefined) {
    this.#provider = provider;
    if (accessToken !== undefined) this.#state = newState(accessToken, undefined, Date.now());
  }

  /** A token is set or can be obtained. */
  get configured(): boolean {
    return this.#state !== undefined || this.#provider !== undefined;
  }

  /** Automatic refresh (and the single 403 replay) is on. */
  get canRefresh(): boolean {
    return this.#provider !== undefined;
  }

  /**
   * Token for an authenticated call. With a provider: obtains the first token, learns an unknown
   * lifetime through `probe` (once per token; a 403 there refreshes immediately) and refreshes once
   * ≥75% of the lifetime has elapsed. `refreshedAfterForbidden` reports that the call's one
   * 403-triggered refresh is used up.
   */
  async resolve(probe: ProbeSession | undefined): Promise<{ token: string; refreshedAfterForbidden: boolean }> {
    let state = this.#state ?? (await this.#refresh(undefined, 'initial'));
    if (!this.#provider) return { token: state.value, refreshedAfterForbidden: false };

    let refreshedAfterForbidden = false;
    if (!state.settled && probe && (await this.#probe(state, probe))) {
      state = await this.#refresh(state, 'forbidden');
      refreshedAfterForbidden = true;
    }
    if (isExpiring(state, Date.now())) state = await this.#refresh(state, 'expiring');
    return { token: state.value, refreshedAfterForbidden };
  }

  /** New token after `sent` got a 403; reuses a newer token if another call already refreshed. */
  async refreshAfterForbidden(sent: string): Promise<string> {
    const state = this.#state;
    if (state && state.value !== sent) return state.value;
    return (await this.#refresh(state, 'forbidden')).value;
  }

  /** Record `session.expired` from an `auth/account/info` answer for `sent`, if it is still current. */
  observeSession(sent: string, body: unknown): void {
    const state = this.#state;
    if (!state || state.value !== sent) return;
    const expired = (body as { session?: { expired?: unknown } } | null)?.session?.expired;
    const expiresAt = typeof expired === 'string' ? Date.parse(expired) : NaN;
    if (Number.isFinite(expiresAt)) {
      state.expiresAt = expiresAt;
      state.settled = true;
    }
  }

  /** Concurrent callers share one in-flight provider call; a caller that saw a stale state gets the newer one. */
  #refresh(from: TokenState | undefined, reason: AccessTokenRefreshReason): Promise<TokenState> {
    if (this.#state && this.#state !== from) return Promise.resolve(this.#state);
    this.#refreshing ??= this.#obtain(reason).finally(() => {
      this.#refreshing = undefined;
    });
    return this.#refreshing;
  }

  async #obtain(reason: AccessTokenRefreshReason): Promise<TokenState> {
    const provider = this.#provider;
    if (!provider) throw new PostwayConfigError('getAccessToken is required to refresh the access token');
    const state = fromProviderResult(await provider(reason), Date.now());
    this.#state = state;
    return state;
  }

  /** `true` when the probe got a 403. Any other failure just settles the token with an unknown lifetime. */
  #probe(state: TokenState, probe: ProbeSession): Promise<boolean> {
    state.probe ??= (async () => {
      try {
        const { status, body } = await probe(state.value);
        if (status >= 200 && status < 300) this.observeSession(state.value, body);
        return status === 403;
      } catch {
        return false;
      } finally {
        state.settled = true;
      }
    })();
    return state.probe;
  }
}

function isExpiring(state: TokenState, now: number): boolean {
  if (state.expiresAt === undefined) return false;
  return now >= state.startsAt + REFRESH_AFTER_ELAPSED * (state.expiresAt - state.startsAt);
}

function fromProviderResult(result: unknown, now: number): TokenState {
  if (typeof result === 'string') {
    assertHeaderValue(result, 'getAccessToken result');
    return newState(result, undefined, now);
  }
  if (typeof result !== 'object' || result === null) {
    throw new PostwayConfigError('getAccessToken must return a token string or { accessToken, expiresAt? }');
  }
  const { accessToken, expiresAt } = result as Partial<AccessToken>;
  assertHeaderValue(accessToken, 'getAccessToken result accessToken');
  if (expiresAt === undefined) return newState(accessToken, undefined, now);
  const ms =
    expiresAt instanceof Date ? expiresAt.getTime() : typeof expiresAt === 'string' ? Date.parse(expiresAt) : NaN;
  if (!Number.isFinite(ms)) {
    throw new PostwayConfigError('getAccessToken result expiresAt must be a valid Date or ISO 8601 string');
  }
  return newState(accessToken, ms, now);
}

function newState(value: string, expiresAt: number | undefined, now: number): TokenState {
  if (expiresAt !== undefined) return { value, startsAt: now, expiresAt, settled: true };
  const jwt = decodeJwtTimes(value);
  if (jwt) return { value, startsAt: jwt.issuedAt ?? now, expiresAt: jwt.expiresAt, settled: true };
  return { value, startsAt: now, expiresAt: undefined, settled: false };
}

/**
 * `exp` / `iat` of a JWT, in epoch ms, read without verifying the signature (they only schedule a
 * refresh). `undefined` for anything that is not a JWT with a numeric `exp`.
 */
export function decodeJwtTimes(token: string): { expiresAt: number; issuedAt?: number } | undefined {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return undefined;
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
  const { exp, iat } = (typeof payload === 'object' && payload !== null ? payload : {}) as {
    exp?: unknown;
    iat?: unknown;
  };
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return undefined;
  const expiresAt = exp * 1000;
  return typeof iat === 'number' && Number.isFinite(iat) && iat < exp
    ? { expiresAt, issuedAt: iat * 1000 }
    : { expiresAt };
}
