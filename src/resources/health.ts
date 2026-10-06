import type { HttpClient, RequestOptions } from '../http.js';

/** `api/health` — liveness. */
export class HealthResource {
  constructor(private readonly http: HttpClient) {}

  /** Resolves to `"pong"` when the Merchant API is reachable. `GET health/ping`, no auth. */
  async ping(options?: RequestOptions): Promise<string> {
    const body = await this.http.request<unknown>({ ...options, method: 'GET', path: ['health', 'ping'], auth: false });
    return String(body ?? '');
  }
}
