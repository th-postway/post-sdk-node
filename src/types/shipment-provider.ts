/** A min/max range (`MerchantShipmentProviderDataWidth` / `…Height` / `…Length`). */
export interface MinMax {
  min: number;
  max: number;
}

/** A range the courier prices on (`…Weight` / `…Cubic` / `…Dimension`). */
export interface CalculatedRange extends MinMax {
  is_calculate: boolean;
}

/** An optional service with limits (`…Cod` / `…Insurance`). */
export interface EnabledRange extends MinMax {
  enable: boolean;
}

/** `MerchantShipmentProviderDataFee`. */
export interface MerchantShipmentProviderFee {
  cod_postway_to_customer: number;
  cod_customer_to_mass: number;
}

/** A courier the store may ship with (`MerchantShipmentProviderData`). */
export interface MerchantShipmentProviderData {
  /** Use this value as `shipment_provider_name` / `shipment_name`. */
  name: string;
  display_name: string;
  width: MinMax;
  height: MinMax;
  length: MinMax;
  weight: CalculatedRange;
  cubic: CalculatedRange;
  dimension: CalculatedRange;
  cod: EnabledRange;
  insurance: EnabledRange;
  fee: MerchantShipmentProviderFee;
}
