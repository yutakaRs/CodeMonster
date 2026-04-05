export function errorResponse(
  code: string,
  message: string,
  status: number,
): Response {
  return Response.json({ error: { code, message } }, { status });
}

export const BAD_REQUEST = (msg: string) =>
  errorResponse("BAD_REQUEST", msg, 400);
export const UNAUTHORIZED = (msg = "Unauthorized") =>
  errorResponse("UNAUTHORIZED", msg, 401);
export const FORBIDDEN = (msg = "Forbidden") =>
  errorResponse("FORBIDDEN", msg, 403);
export const NOT_FOUND = (msg = "Not found") =>
  errorResponse("NOT_FOUND", msg, 404);
export const INTERNAL_ERROR = (msg = "Internal server error") =>
  errorResponse("INTERNAL_ERROR", msg, 500);
