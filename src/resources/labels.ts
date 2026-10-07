import { param, type HttpClient, type RequestOptions } from '../core/http-client.js';
import type { FileHttpResponse } from '../types/common.js';
import type { MerchantLabelOrderShipmentsRequest, MerchantLabelReceiptOptions } from '../types/labels.js';

/** `label/*` — printable shipping labels and receipts, returned as base64 files. */
export class LabelsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * One file containing the labels of every matching parcel. `POST label/order/shipments`.
   * Decode with `decodeFile()`.
   *
   * @throws PostwayApiError (400) when none of `tracking_nos` matches a parcel of the store.
   */
  orderShipments(request: MerchantLabelOrderShipmentsRequest, options?: RequestOptions): Promise<FileHttpResponse> {
    return this.http.request({
      ...options,
      method: 'POST',
      path: ['label', 'order', 'shipments'],
      body: request,
      auth: true,
    });
  }

  /** A printable receipt by receipt number. `GET label/receipt/:receipt_no?receipt_size=`. */
  receipt(
    receiptNo: string,
    { receiptSize, ...options }: MerchantLabelReceiptOptions & RequestOptions = {},
  ): Promise<FileHttpResponse> {
    return this.http.request({
      ...options,
      method: 'GET',
      path: ['label', 'receipt', param('receipt_no', receiptNo)],
      query: { receipt_size: receiptSize },
      auth: true,
    });
  }
}
