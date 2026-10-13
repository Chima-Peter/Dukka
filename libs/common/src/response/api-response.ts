export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export function successResponse<T>(
  data: T,
  message = 'Success',
): ApiResponse<T> {
  return { success: true, message, data };
}

export function errorResponse(
  message: string,
  data: unknown = null,
): ApiResponse {
  return { success: false, message, data };
}
