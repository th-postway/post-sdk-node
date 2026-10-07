/**
 * Runnable version of the README Quick start. See demo/README.md.
 *
 *   npm run demo
 *
 * Read-only by default and pointed at sandbox. Creating a parcel and printing its label needs
 * POSTWAY_DEMO_CREATE=1 and only ever runs against the sandbox base URL.
 */
import {
  LabelOrientation,
  LabelSize,
  MERCHANT_BASE_URLS,
  PostwayApiError,
  PostwayBusinessError,
  PostwayMerchantClient,
  decodeFile,
} from '@th-postway/post-sdk';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const accessToken = process.env.POSTWAY_ACCESS_TOKEN || process.env.POSTWAY_MERCHANT_ACCESS_TOKEN;
const baseUrl = process.env.POSTWAY_MERCHANT_BASE_URL || MERCHANT_BASE_URLS.sandbox;
const createEnabled = process.env.POSTWAY_DEMO_CREATE === '1';
const outputDir = join(import.meta.dirname, 'output');

const postway = new PostwayMerchantClient({ baseUrl, accessToken }); // never hardcode the token

try {
  await run();
} catch (error) {
  if (error instanceof PostwayBusinessError) {
    console.error('Refused by the API:', error.messages);
  } else if (error instanceof PostwayApiError && error.status === 403) {
    console.error('HTTP 403: the access token is missing, unknown or expired.');
  } else {
    throw error;
  }
  process.exitCode = 1;
}

async function run(): Promise<void> {
  // 1. Public endpoint: works without a token.
  console.log(`Base URL: ${postway.baseUrl}`);
  console.log('health.ping ->', await postway.health.ping());

  if (!accessToken) {
    console.error('Set POSTWAY_ACCESS_TOKEN (or POSTWAY_MERCHANT_ACCESS_TOKEN) to run the authenticated steps.');
    process.exitCode = 1;
    return;
  }

  // 2. Who am I?
  const account = await postway.auth.accountInfo();
  console.log(`Store: ${account.store.name}, token expires ${account.session.expired}`);

  // 3. Couriers this store may use.
  const providers = await postway.shipmentProviders.all();
  console.log('Couriers:', providers.map(provider => provider.name).join(', ') || '(none)');

  // 4. Thai postal areas for one zip code.
  const areas = await postway.thailand.filter({ page: 1, limit: 5, zip_code: '10500' });
  for (const area of areas.data) {
    console.log(`Area: ${area.sub_district} / ${area.district} / ${area.province} ${area.zipcode}`);
  }

  // 5. The store's latest parcels (status only).
  const parcels = await postway.orderShipments.filter({ page: 1, limit: 5 });
  console.log(`Parcels: ${parcels.count} in total`);
  for (const row of parcels.data) console.log(`  - ${row.order_shipment_status}`);

  if (!createEnabled) {
    console.log('Read-only run complete. Set POSTWAY_DEMO_CREATE=1 to create a sandbox parcel and print its label.');
    return;
  }
  if (postway.baseUrl !== MERCHANT_BASE_URLS.sandbox) {
    console.error('POSTWAY_DEMO_CREATE=1 only runs against the sandbox base URL; refusing to create a parcel.');
    process.exitCode = 1;
    return;
  }

  // 6. Create a parcel (not idempotent: the SDK never retries it).
  const [parcel] = await postway.orderShipments.create({
    shipping: { shipment_provider_name: providers[0]?.name ?? 'Flash', my_tracking_no: `DEMO-${Date.now()}` },
    sender: {
      fullname: 'My Shop',
      mobile_phone: '0811111111',
      address: '1 Silom Rd',
      sub_district: 'สีลม',
      district: 'บางรัก',
      province: 'กรุงเทพมหานคร',
      zip_code: '10500',
    },
    recipient: {
      fullname: 'Customer',
      mobile_phone: '0822222222',
      address: '2 Nimman Rd',
      sub_district: 'สุเทพ',
      district: 'เมืองเชียงใหม่',
      province: 'เชียงใหม่',
      zip_code: '50200',
    },
    package: { insurance_value: 0, weight: 500, width: 10, length: 20, height: 5 },
    product_cods: [], // empty = not COD
  });
  console.log(`Created parcel ${parcel!.package.my_tracking_no} (${parcel!.order_shipment_status})`);

  // 7. Print its label.
  const label = await postway.labels.orderShipments({
    tracking_nos: [parcel!.package.tracking_no],
    label_size: LabelSize.Size4x6,
    label_orientation: LabelOrientation.Portrait,
  });
  await mkdir(outputDir, { recursive: true });
  // basename() keeps a server-supplied name from escaping the output directory.
  const labelPath = join(outputDir, basename(label.file_name));
  await writeFile(labelPath, decodeFile(label));
  console.log(`Label saved to ${labelPath}`);
}
