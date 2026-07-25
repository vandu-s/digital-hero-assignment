/**
 * Matches the server's standard response envelopes exactly
 * (see server/src/middleware/errorHandler.ts and every controller).
 */
import { PaginationMeta } from "./models";

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
    details?: Record<string, string[] | undefined>;
  };
}
