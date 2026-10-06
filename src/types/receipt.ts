import type { IsoDateString } from './common.js';
import type { OrderShipmentStatus } from './enums.js';

/** A price line on the public receipt (no cost fields). */
export interface PublicReceiptPriceInfo {
  description: string;
  price: number;
}

/** A parcel on the public receipt (`PublicReceiptShipment`). */
export interface PublicReceiptShipment {
  seq: number;
  shipment_provider_name: string;
  tracking_no: string;
  recipient_fullname: string;
  recipient_mobile_phone_masked: string;
  recipient_province: string;
  recipient_zip_code: string;
  weight: number;
  width: number;
  length: number;
  height: number;
  cod: number;
  status: OrderShipmentStatus;
  status_text: string;
  created_at: IsoDateString | null;
  in_transit_at: IsoDateString | null;
  completed_at: IsoDateString | null;
  in_transit_at_text: string;
  completed_at_text: string;
  price_infos: PublicReceiptPriceInfo[];
}

/** `GET receipt/public/:token` response (`PublicReceiptResponse`). */
export interface PublicReceiptResponse {
  /** `false` when the whole receipt was cancelled. */
  is_available: boolean;
  message: string;
  no: string;
  /** Formatted `yyyy/MM/dd HH:mm:ss` (not ISO). */
  created_at: string;
  store_name: string;
  is_show_public_receipt_store_name: boolean;
  is_show_public_receipt_header: boolean;
  is_show_public_receipt_package_detail: boolean;
  is_show_public_receipt_total: boolean;
  price_discount: number;
  price_total: number;
  price_get_total: number;
  price_charge_total: number;
  shipments: PublicReceiptShipment[];
}
