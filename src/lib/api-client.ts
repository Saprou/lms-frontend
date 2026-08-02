import { API_URL, TOKEN_COOKIE, apiFetch, type ApiOptions } from "./api-config";

export { API_URL, TOKEN_COOKIE };

export function getClientToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setClientToken(token: string | null) {
  if (typeof document === "undefined") return;
  if (!token) {
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${7 * 86400}; SameSite=Lax`;
}

export async function clientApi<T = unknown>(
  path: string,
  options: Omit<ApiOptions, "token"> = {}
): Promise<T> {
  return apiFetch<T>(path, { ...options, token: getClientToken() });
}
