import type { IsoDateString } from './common.js';
import type { StoreBillingType, StoreCodType, UserRole } from './enums.js';

/** `MerchantAuthAccountInfoResponseUser` — the store owner the session acts as. */
export interface MerchantAccountUser {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  mobile_phone: string;
  role: UserRole;
}

/** `MerchantAuthAccountInfoResponseStore`. */
export interface MerchantAccountStore {
  code: string;
  name: string;
  mobile_phone: string;
  store_billing_type: StoreBillingType;
  store_cod_type: StoreCodType;
  address: string;
  sub_district: string;
  district: string;
  province: string;
  zip_code: string;
}

/** `MerchantAuthAccountInfoResponseSession`. */
export interface MerchantAccountSession {
  /** When the access token stops being accepted. */
  expired: IsoDateString;
}

/** `POST auth/account/info` response (`MerchantAuthAccountInfoResponse`). */
export interface MerchantAuthAccountInfoResponse {
  store: MerchantAccountStore;
  user: MerchantAccountUser;
  session: MerchantAccountSession;
}
