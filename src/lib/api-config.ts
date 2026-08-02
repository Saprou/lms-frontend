export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const TOKEN_COOKIE = "lms_token";

export type ApiOptions = Omit<RequestInit, "body"> & {
  token?: string | null;
  json?: unknown;
  formData?: FormData;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { token, json, formData, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (formData) {
    body = formData;
  } else if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    body,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : data?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}
