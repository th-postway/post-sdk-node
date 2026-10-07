# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Runnable Quick start in `demo/` (`npm run demo`): read-only and sandbox by default, with an opt-in sandbox create + label (`POSTWAY_DEMO_CREATE=1`). `npm run typecheck` also checks the demo. Not part of the published package.

### Changed

- Release tags are bare SemVer (`MAJOR.MINOR.PATCH`, no `v` prefix) and are cut through git-flow: CI runs on `develop`, `release/**` and `hotfix/**`, and Publish only accepts a tag on `main` that equals the package version. Dependabot targets `develop`.

## [22.0.0] - 2026-10-07

Initial public release.

### Added

- `PostwayMerchantClient` with resources for auth, order shipments, shipment providers, Thailand postal areas, labels, public receipts and health.
- Runtime enums (`LabelSize`, `OrderShipmentStatus`, ...) exported as `as const` objects plus union types.
- `decodeFile()` for base64 label and receipt files.
- Typed errors: `PostwayApiError`, `PostwayBusinessError`, `PostwayRequestError`, `PostwayConfigError`.

### Security

- `baseUrl` must be `https://` (plain `http://` only for loopback hosts) with no credentials, query or fragment.
- `accessToken`, `tokenType` and `userAgent` are validated as safe header values at construction.
- Caller-supplied path parameters may not be empty, `.` or `..`.
- Redirects are refused.
- Error `url` and `message` report route templates (`receipt/public/:token`) instead of parameter values; `PostwayApiError.body` is non-enumerable.
- `PostwayConfigError` messages never echo the offending input.

### Changed

- Only the `production` and `sandbox` environments are built in. Pass `baseUrl` for any other host.

[Unreleased]: https://github.com/th-postway/post-sdk-node/compare/22.0.0...HEAD
[22.0.0]: https://github.com/th-postway/post-sdk-node/releases/tag/22.0.0
