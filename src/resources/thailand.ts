import type { HttpClient, RequestOptions } from '../core/http-client.js';
import type { FilterResponse } from '../types/common.js';
import type { MerchantThailand, MerchantThailandFilterRequest } from '../types/thailand.js';

/** `thailand/*` — Thai postal areas with courier coverage and surcharge flags. */
export class ThailandResource {
  constructor(private readonly http: HttpClient) {}

  /** Search postal areas. `POST thailand/filter`. */
  filter(request: MerchantThailandFilterRequest, options?: RequestOptions): Promise<FilterResponse<MerchantThailand>> {
    // older servers return 500 when the array is missing, so always send it
    const body = { ...request, shipment_provider_names: request.shipment_provider_names ?? [] };
    return this.http.request({ ...options, method: 'POST', path: ['thailand', 'filter'], body, auth: true });
  }
}
