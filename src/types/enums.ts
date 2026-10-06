/**
 * Enum values used on the Merchant API wire.
 *
 * Copied from `@postway/data` 22.0.2 (the server's source of truth). That package lives on
 * Postway's private registry, so the values are mirrored here instead of depended on. Each enum
 * is a frozen `as const` object (usable at runtime) plus a union type of its values.
 */

type ValueOf<T> = T[keyof T];

/** Label paper size, for `labels.orderShipments`. */
export const LabelSize = {
  Size4x3: '4x3',
  Size4x4: '4x4',
  Size4x6: '4x6',
  Size6x4: '6x4',
  SizeA4: 'A4',
  Size80mm: '80mm',
} as const;
export type LabelSize = ValueOf<typeof LabelSize>;

/** Label orientation, for `labels.orderShipments`. */
export const LabelOrientation = {
  Portrait: 'Portrait',
  Landscape: 'Landscape',
} as const;
export type LabelOrientation = ValueOf<typeof LabelOrientation>;

/** Receipt paper width, for `labels.receipt`. */
export const ReceiptSize = {
  R58mm: '58mm',
  R80mm: '80mm',
} as const;
export type ReceiptSize = ValueOf<typeof ReceiptSize>;

/** Parcel content category (numeric on the wire), for `MerchantOrderShipmentCreatePackage.type`. */
export const FlashArticleCategory = {
  File: 0,
  DryFood: 1,
  Commodity: 2,
  DigitalProduct: 3,
  Clothes: 4,
  Books: 5,
  AutoParts: 6,
  ShoesAndBags: 7,
  SportsEquipment: 8,
  Cosmetics: 9,
  Household: 10,
  Fruit: 11,
  Others: 99,
} as const;
export type FlashArticleCategory = ValueOf<typeof FlashArticleCategory>;

/** Order lifecycle status. */
export const OrderStatus = {
  Pending: 'pending',
  OnProcess: 'on processing',
  Completed: 'completed',
} as const;
export type OrderStatus = ValueOf<typeof OrderStatus>;

/** Parcel (shipment) status. */
export const OrderShipmentStatus = {
  Prepared: 'Prepared',
  WaitForDropOff: 'WaitForDropOff',
  InTransit: 'In-Transit',
  Cancel: 'Cancel',
  Complete: 'Complete',
  Reject: 'Reject',
  Claim: 'Claim',
} as const;
export type OrderShipmentStatus = ValueOf<typeof OrderShipmentStatus>;

/** Channel an order shipment was created through; Merchant API orders are `API`. */
export const OrderShipmentChannel = {
  V1: 'V1',
  V2: 'V2',
  V3: 'V3',
  UploadSheet: 'UPLOAD_SHEET',
  API: 'API',
} as const;
export type OrderShipmentChannel = ValueOf<typeof OrderShipmentChannel>;

/** How the store pays for shipping. */
export const StoreBillingType = {
  TopUp: 'Top Up',
  Monthly: 'Monthly',
} as const;
export type StoreBillingType = ValueOf<typeof StoreBillingType>;

/** How the store receives COD money. */
export const StoreCodType = {
  Receipt: 'receipt',
  BillingTransfer: 'billing_transfer',
} as const;
export type StoreCodType = ValueOf<typeof StoreCodType>;

export const UserRole = {
  Admin: 'Admin',
  User: 'User',
  Public: 'Public',
} as const;
export type UserRole = ValueOf<typeof UserRole>;

/** Price line description (Thai text on the wire). */
export const PriceInfoDescription = {
  Shipment: 'ค่าขนส่ง',
  Insurance: 'ค่าประกัน',
  Tourist: 'ค่าพื้นที่ท่องเที่ยว',
  IsLand: 'ค่าพื้นที่เกาะ',
  RemoteArea: 'ค่าพื้นที่ห่างไกล',
  COD: 'ค่า COD',
  TopUp: 'เติมเงิน',
  Product: 'ค่าสินค้า',
  Pickup: 'ค่าเรียกรถเข้ารับ',
  Other: 'อื่นๆ',
  Oil: 'ค่าน้ำมัน',
  Move: 'ค่าบริการเรียกรถ Move',
  ServiceCharge: 'ค่าบริการ',
} as const;
export type PriceInfoDescription = ValueOf<typeof PriceInfoDescription>;

/** Pricing region: Bangkok or upcountry. */
export const PlanDetailRegion = {
  BKK: 'BKK',
  UPC: 'UPC',
} as const;
export type PlanDetailRegion = ValueOf<typeof PlanDetailRegion>;

/** What the price plan was calculated on. */
export const PlanDetailType = {
  Weight: 'weight',
  Dimension: 'dimension',
  Cubic: 'cubic',
} as const;
export type PlanDetailType = ValueOf<typeof PlanDetailType>;
