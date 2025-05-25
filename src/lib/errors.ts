// src/lib/errors.ts
export function isUserRejectionError(error: any) {
  return error?.message?.includes("user rejected");
}
