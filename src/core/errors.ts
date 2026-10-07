/** Base class for every error thrown by this SDK. */
export class PostwayError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** The client is missing configuration a call needs (e.g. no access token for a guarded route). */
export class PostwayConfigError extends PostwayError {}

/** Details shared by API-level errors. */
export interface PostwayApiErrorDetails {
  method: string;
  url: string;
  /** HTTP status of the response. */
  status: number;
  /** Body `code` from the server envelope, when present (400 or 500 on errors). */
  code?: number;
  /** Server messages; validation failures return several. */
  messages: string[];
  /** Parsed response body (JSON object, text, or `null`). */
  body: unknown;
}

/**
 * The server answered with a non-2xx status. Error bodies have the shape
 * `{ code, isSuccess: false, message, data: null }`.
 *
 * Typical statuses: 400 (validation / business rule), 403 (missing, unknown or expired token),
 * 404 (public receipt not found), 500 (server error).
 */
export class PostwayApiError extends PostwayError implements PostwayApiErrorDetails {
  readonly method: string;
  readonly url: string;
  readonly status: number;
  readonly code?: number;
  readonly messages: string[];
  readonly body: unknown;

  constructor(details: PostwayApiErrorDetails, message?: string) {
    super(message ?? (details.messages.join('; ') || `HTTP ${details.status}`));
    this.method = details.method;
    this.url = details.url;
    this.status = details.status;
    if (details.code !== undefined) this.code = details.code;
    this.messages = details.messages;
    this.body = details.body;
  }
}

/**
 * The server answered 2xx but its envelope says `isSuccess: false`. `order-shipment/create` and
 * `cancel` report courier/verification failures this way (with HTTP 201), so the SDK turns them
 * into an exception rather than a successful result.
 */
export class PostwayBusinessError extends PostwayApiError {}

/** The request did not complete: network failure, abort, or timeout. */
export class PostwayRequestError extends PostwayError {
  readonly method: string;
  readonly url: string;

  constructor(method: string, url: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.method = method;
    this.url = url;
  }
}
