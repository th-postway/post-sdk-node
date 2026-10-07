import type { LabelOrientation, LabelSize, ReceiptSize } from './enums.js';

/** `POST label/order/shipments` request (`MerchantLabelOrderShipmentsRequest`). */
export interface MerchantLabelOrderShipmentsRequest {
  /** Each entry may be a `tracking_no`, `my_tracking_no` or `ref1..3`. */
  tracking_nos: string[];
  label_size: LabelSize;
  label_orientation: LabelOrientation;
}

/** Options for `labels.receipt`. */
export interface MerchantLabelReceiptOptions {
  receiptSize?: ReceiptSize;
}
