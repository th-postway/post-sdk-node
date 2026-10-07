import { param, type HttpClient, type RequestOptions } from '../core/http-client.js';
import type { FilterResponse } from '../types/common.js';
import type {
  MerchantOrderShipmentCalculatePriceRequest,
  MerchantOrderShipmentCalculatePriceResponse,
  MerchantOrderShipmentCreateRequest,
  MerchantOrderShipmentData,
  MerchantOrderShipmentFilterRequest,
} from '../types/order-shipments.js';

/** `order-shipment/*` — the store's parcels. Every call is scoped to the token's store. */
export class OrderShipmentsResource {
  constructor(private readonly http: HttpClient) {}

  /** Find a parcel by courier tracking number; `null` when none. `GET order-shipment/get-by-tracking-no/:tracking_no`. */
  async getByTrackingNo(trackingNo: string, options?: RequestOptions): Promise<MerchantOrderShipmentData | null> {
    return (
      (await this.http.request<MerchantOrderShipmentData | null>({
        ...options,
        method: 'GET',
        path: ['order-shipment', 'get-by-tracking-no', param('tracking_no', trackingNo)],
        auth: true,
      })) ?? null
    );
  }

  /** Find a parcel whose `ref1`, `ref2` or `ref3` equals `ref`; `null` when none. `GET order-shipment/get-by-ref/:ref`. */
  async getByRef(ref: string, options?: RequestOptions): Promise<MerchantOrderShipmentData | null> {
    return (
      (await this.http.request<MerchantOrderShipmentData | null>({
        ...options,
        method: 'GET',
        path: ['order-shipment', 'get-by-ref', param('ref', ref)],
        auth: true,
      })) ?? null
    );
  }

  /** Page through the store's parcels, newest first. `POST order-shipment/filter`. */
  filter(
    request: MerchantOrderShipmentFilterRequest,
    options?: RequestOptions,
  ): Promise<FilterResponse<MerchantOrderShipmentData>> {
    return this.http.request({
      ...options,
      method: 'POST',
      path: ['order-shipment', 'filter'],
      body: request,
      auth: true,
    });
  }

  /**
   * Create one or more parcels, book them with the courier and issue the receipt.
   * `POST order-shipment/create`.
   *
   * Not idempotent and never retried by the SDK. The batch stops at the first failure: parcels
   * created before it remain, so on `PostwayBusinessError` look them up by `my_tracking_no`
   * before resubmitting.
   *
   * @returns the created parcels, including their courier `tracking_no`.
   * @throws PostwayBusinessError when verification, creation or receipt issue fails.
   */
  create(
    requests: MerchantOrderShipmentCreateRequest | readonly MerchantOrderShipmentCreateRequest[],
    options?: RequestOptions,
  ): Promise<MerchantOrderShipmentData[]> {
    const body = Array.isArray(requests) ? requests : [requests];
    return this.http.requestEnvelope({
      ...options,
      method: 'POST',
      path: ['order-shipment', 'create'],
      body,
      auth: true,
    });
  }

  /** Quote the price of one parcel without creating it. `POST order-shipment/calculate-price`. */
  calculatePrice(
    request: MerchantOrderShipmentCalculatePriceRequest,
    options?: RequestOptions,
  ): Promise<MerchantOrderShipmentCalculatePriceResponse> {
    return this.http.request({
      ...options,
      method: 'POST',
      path: ['order-shipment', 'calculate-price'],
      body: request,
      auth: true,
    });
  }

  /**
   * Cancel a parcel by courier tracking number (not `my_tracking_no` or refs).
   * `POST order-shipment/cancel`.
   *
   * @throws PostwayApiError (400) when the parcel is not found.
   * @throws PostwayBusinessError when the cancellation is refused.
   */
  async cancel(trackingNo: string, options?: RequestOptions): Promise<void> {
    await this.http.requestEnvelope({
      ...options,
      method: 'POST',
      path: ['order-shipment', 'cancel'],
      body: { tracking_no: trackingNo },
      auth: true,
    });
  }
}
