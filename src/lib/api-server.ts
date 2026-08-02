import { cookies } from "next/headers";
import { TOKEN_COOKIE, apiFetch, type ApiOptions } from "./api-config";

export async function getServerToken() {
  const jar = await cookies();
  return jar.get(TOKEN_COOKIE)?.value ?? null;
}

export async function serverApi<T = unknown>(
  path: string,
  options: Omit<ApiOptions, "token"> = {}
): Promise<T> {
  const token = await getServerToken();
  return apiFetch<T>(path, { ...options, token });
}
