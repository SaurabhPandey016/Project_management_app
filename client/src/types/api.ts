export interface ApiSuccess<TData> {
  success: true;
  data: TData;
  message?: string;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;
