import type { FilterRequest } from './common.js';

/**
 * `POST thailand/filter` request (`MerchantThailandFilterRequest`). Field filters are exact
 * matches; `filter` matches any of sub-district / district / province / zipcode exactly.
 */
export interface MerchantThailandFilterRequest extends FilterRequest {
  /** Restrict to areas served by these couriers. Omit (or `[]`) for all couriers. */
  shipment_provider_names?: string[];
  sub_district?: string;
  district?: string;
  province?: string;
  zip_code?: string;
}

/** One postal area (`MerchantThailand`). Note the response spells it `zipcode`. */
export interface MerchantThailand {
  shipment_provider_names: string[];
  sub_district: string;
  district: string;
  province: string;
  zipcode: string;
  is_island: boolean;
  is_tourist: boolean;
  is_remote_area: boolean;
}
