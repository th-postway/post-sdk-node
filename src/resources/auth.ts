import type { HttpClient, RequestOptions } from '../core/http-client.js';
import type { MerchantAuthAccountInfoResponse } from '../types/auth.js';

/** `auth/*` — session introspection. */
export class AuthResource {
  constructor(private readonly http: HttpClient) {}

  /** The store, owner and session expiry behind the access token. `POST auth/account/info`. */
  accountInfo(options?: RequestOptions): Promise<MerchantAuthAccountInfoResponse> {
    return this.http.request({ ...options, method: 'POST', path: ['auth', 'account', 'info'], auth: true });
  }
}
