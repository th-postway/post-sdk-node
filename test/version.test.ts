import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as sdk from '../src/index.js';

describe('package surface', () => {
  it('SDK_VERSION matches package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
    expect(sdk.SDK_VERSION).toBe(pkg.version);
  });

  it('exports the client, errors, helpers and runtime enums', () => {
    expect(Object.keys(sdk).sort()).toEqual(
      [
        'AuthResource',
        'FlashArticleCategory',
        'HealthResource',
        'LabelOrientation',
        'LabelSize',
        'LabelsResource',
        'MERCHANT_BASE_URLS',
        'OrderShipmentChannel',
        'OrderShipmentStatus',
        'OrderShipmentsResource',
        'OrderStatus',
        'PlanDetailRegion',
        'PlanDetailType',
        'PostwayApiError',
        'PostwayBusinessError',
        'PostwayConfigError',
        'PostwayError',
        'PostwayMerchantClient',
        'PostwayRequestError',
        'PriceInfoDescription',
        'ReceiptSize',
        'ReceiptsResource',
        'SDK_VERSION',
        'ShipmentProvidersResource',
        'StoreBillingType',
        'StoreCodType',
        'ThailandResource',
        'UserRole',
        'decodeFile',
      ].sort(),
    );
  });
});
