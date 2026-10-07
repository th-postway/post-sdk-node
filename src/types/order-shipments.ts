import type { FilterRequest, IsoDateString } from './common.js';
import type {
  FlashArticleCategory,
  OrderShipmentChannel,
  OrderShipmentStatus,
  OrderStatus,
  PlanDetailRegion,
  PlanDetailType,
  PriceInfoDescription,
} from './enums.js';

// ---------------------------------------------------------------- read model

/** `MerchantOrderShipmentDataSender` / `…Recipient`. */
export interface MerchantOrderShipmentParty {
  fullname: string;
  mobile_phone: string;
  address: string;
  sub_district: string;
  district: string;
  province: string;
  zip_code: string;
}

/** `MerchantOrderShipmentDataPackage` — dimensions in cm, weight in grams. */
export interface MerchantOrderShipmentDataPackage {
  width: number;
  length: number;
  height: number;
  weight: number;
  /** The merchant's own reference given at create time. */
  my_tracking_no: string;
  /** Courier tracking number. */
  tracking_no: string;
  ref1: string;
  ref2: string;
  ref3: string;
}

/** One parcel as returned by every order-shipment read (`MerchantOrderShipmentData`). */
export interface MerchantOrderShipmentData {
  channel: OrderShipmentChannel;
  sender: MerchantOrderShipmentParty;
  recipient: MerchantOrderShipmentParty;
  package: MerchantOrderShipmentDataPackage;
  status: OrderStatus;
  order_shipment_status: OrderShipmentStatus;
  created_at: IsoDateString;
  updated_at: IsoDateString | null;
  in_transit_at: IsoDateString | null;
  completed_at: IsoDateString | null;
}

/**
 * `POST order-shipment/filter` request. `filter` is a case-insensitive match against sender and
 * recipient name/phone/address fields, `my_tracking_no`, `tracking_no` and `ref1..3`.
 */
export type MerchantOrderShipmentFilterRequest = FilterRequest;

// ---------------------------------------------------------------- create

/** `MerchantOrderShipmentCreateRequestShipping`. */
export interface MerchantOrderShipmentCreateShipping {
  /** A `name` from `shipmentProviders.all()`, e.g. `"Flash"`. */
  shipment_provider_name: string;
  /** Your own reference for the parcel. */
  my_tracking_no?: string;
  /** Only for couriers where you already hold a tracking number. */
  shipment_provider_tracking_no?: string;
}

/** `MerchantOrderShipmentCreateRequestSender`. */
export interface MerchantOrderShipmentCreateSender {
  fullname: string;
  email?: string;
  mobile_phone: string;
  /** National ID / passport number, when the courier requires it. */
  card_no?: string;
  address: string;
  sub_district: string;
  district: string;
  province: string;
  zip_code: string;
}

/** `MerchantOrderShipmentCreateRequestRecipient`. */
export interface MerchantOrderShipmentCreateRecipient {
  fullname: string;
  email?: string;
  mobile_phone: string;
  address: string;
  sub_district: string;
  district: string;
  province: string;
  zip_code: string;
}

/** `MerchantOrderShipmentCreateRequestPackage` — dimensions in cm (≥ 1), weight in grams. */
export interface MerchantOrderShipmentCreatePackage {
  /** Declared value to insure; `0` = no insurance. */
  insurance_value: number;
  note?: string;
  /** Defaults to `FlashArticleCategory.Others` (99) on the server. */
  type?: FlashArticleCategory;
  weight: number;
  width: number;
  height: number;
  length: number;
}

/**
 * `MerchantOrderShipmentCreateRequestProductCod`. The COD amount collected from the recipient is
 * the sum of `price_per_item × amount` over all lines; send an empty array for non-COD parcels.
 */
export interface MerchantOrderShipmentCreateProductCod {
  name: string;
  amount: number;
  price_per_item: number;
}

/** One parcel to create (`MerchantOrderShipmentCreateRequest`). */
export interface MerchantOrderShipmentCreateRequest {
  shipping: MerchantOrderShipmentCreateShipping;
  sender: MerchantOrderShipmentCreateSender;
  recipient: MerchantOrderShipmentCreateRecipient;
  package: MerchantOrderShipmentCreatePackage;
  product_cods: MerchantOrderShipmentCreateProductCod[];
}

// ---------------------------------------------------------------- calculate price

/**
 * `POST order-shipment/calculate-price` request. `r_*` = recipient area, `p_*` = parcel
 * (weight in grams, dimensions in cm, COD and insurance in THB).
 */
export interface MerchantOrderShipmentCalculatePriceRequest {
  /** A `name` from `shipmentProviders.all()`. */
  shipment_name: string;
  r_sub_district: string;
  r_district: string;
  r_province: string;
  r_zip_code: string;
  p_weight: number;
  p_width: number;
  p_height: number;
  p_length: number;
  p_cod: number;
  p_insurance: number;
}

/** One price line (`PriceInfo`). */
export interface PriceInfo {
  description: PriceInfoDescription;
  /** Price charged to the store. */
  price: number;
  cost: number;
  cashback_cost: number;
  is_reward_cashback: boolean;
  total_affliliate: number;
}

/** Which plan bracket the price came from (`OrderShipmentPlanDetail`). */
export interface OrderShipmentPlanDetail {
  region: PlanDetailRegion;
  type: PlanDetailType;
  min_boundary: number;
  max_boundary: number;
}

/** `MerchantOrderShipmentCalculatePriceResponse`. */
export interface MerchantOrderShipmentCalculatePriceResponse {
  price_infos: PriceInfo[];
  plan_detail: OrderShipmentPlanDetail;
}
