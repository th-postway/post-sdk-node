/** ISO-8601 timestamp as serialised by the server (`Date` → JSON string). */
export type IsoDateString = string;

/** Paging input shared by every `filter` endpoint (`FilterBaseRequest`). */
export interface FilterRequest {
  /** Free-text search; semantics depend on the endpoint. */
  filter?: string;
  /** Page size, 1..1,000,000. */
  limit: number;
  /** 1-based page number. Pages past the end wrap back to page 1 on the server. */
  page: number;
}

/** Paging output shared by every `filter` endpoint (`FilterBaseResponse<T>`). */
export interface FilterResponse<T> {
  count: number;
  limit: number;
  page: number;
  page_count: number;
  data: T[];
}

/**
 * Envelope used by `order-shipment/create` / `cancel` and by every error body
 * (`HttpBaseResponse<T>`). `code` is a body code, not the HTTP status.
 */
export interface HttpBaseResponse<T> {
  code: number;
  isSuccess: boolean;
  /** A string, or a list of messages for request-validation failures. */
  message: string | string[];
  data: T;
}

/** A generated file returned as JSON with base64 content (`FileHttpResponse`). */
export interface FileHttpResponse {
  file_name: string;
  /** Base64-encoded file bytes; decode with `decodeFile()`. */
  content: string;
  content_type: string;
  content_length: number;
}
