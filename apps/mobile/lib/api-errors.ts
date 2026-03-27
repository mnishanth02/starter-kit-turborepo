export type ApiFieldError = {
  field: string;
  message: string;
};

export type ApiErrorResponse = {
  code: string;
  message: string;
  errors?: ApiFieldError[];
};

export class ApiResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly errors: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiResponseError';
  }
}

export async function unwrapResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  let payload: ApiErrorResponse | null = null;

  try {
    payload = (await response.json()) as ApiErrorResponse;
  } catch {
    payload = null;
  }

  throw new ApiResponseError(
    payload?.message ?? 'Request failed',
    response.status,
    payload?.code ?? 'UNKNOWN_ERROR',
    payload?.errors ?? [],
  );
}
