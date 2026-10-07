import type { FileHttpResponse } from '../types/common.js';

/** Decode the base64 `content` of a label/receipt file into bytes. */
export function decodeFile(file: Pick<FileHttpResponse, 'content'>): Buffer {
  return Buffer.from(file.content, 'base64');
}
