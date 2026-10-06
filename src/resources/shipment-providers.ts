import type { HttpClient, RequestOptions } from '../http.js';
import type { MerchantShipmentProviderData } from '../types/shipment-provider.js';

/** `api/shipment-provider` — couriers available to the store. */
export class ShipmentProvidersResource {
  constructor(private readonly http: HttpClient) {}

  /** Active couriers after the store's white/blacklist, sorted by name. `GET shipment-provider/all`. */
  all(options?: RequestOptions): Promise<MerchantShipmentProviderData[]> {
    return this.http.request({ ...options, method: 'GET', path: ['shipment-provider', 'all'], auth: true });
  }
}
