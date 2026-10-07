import type { HttpClient, RequestOptions } from '../core/http-client.js';
import type { PublicReceiptResponse } from '../types/receipts.js';

/**
 * `api/receipt` — the public receipt behind the QR code printed on receipts.
 * No access token is sent; the receipt token in the URL is the credential.
 */
export class ReceiptsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Receipt data as JSON. `GET receipt/public/:token`.
   *
   * @throws PostwayApiError (404) when the token is invalid or the receipt is gone.
   */
  getPublic(token: string, options?: RequestOptions): Promise<PublicReceiptResponse> {
    return this.http.request({ ...options, method: 'GET', path: ['receipt', 'public', token], auth: false });
  }

  /**
   * The rendered public receipt page. `GET receipt/:token`.
   *
   * @throws PostwayApiError (404) when the token is invalid; its `body` holds the "not found" page.
   */
  async getPublicHtml(token: string, options?: RequestOptions): Promise<string> {
    return (
      (await this.http.request<string | null>({ ...options, method: 'GET', path: ['receipt', token], auth: false })) ??
      ''
    );
  }

  /** The URL of the public receipt page, e.g. to show or encode as a QR code. */
  publicUrl(token: string): string {
    return this.http.url(['receipt', token]);
  }
}
