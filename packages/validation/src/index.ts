export type { ZodSchema, ZodType } from 'zod';
export { z } from 'zod';
export type { ApiError, FieldError } from './errors';
export { ErrorCode } from './errors';
export { queryKeys } from './query-keys';
export type {
  CreateProjectInput,
  PaginatedResponse,
  PaginationQuery,
  UpdateProjectInput,
  UploadConfirmInput,
  UploadSessionRequest,
} from './schemas/index';
export {
  createProjectInput,
  paginationQuery,
  updateProjectInput,
  uploadConfirmInput,
  uploadSessionRequest,
} from './schemas/index';

/** Shared React Query defaults — import in both web and mobile QueryClient factories. */
export const QUERY_DEFAULTS = {
  staleTime: 60 * 1_000,
  gcTime: 5 * 60 * 1_000,
} as const;
