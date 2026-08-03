import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api-config";
import { getServerToken } from "@/lib/api-server";
import type { AuthUser } from "@/lib/types";

export type { AuthUser };

export async function getServerUser(): Promise<AuthUser | null> {
  const token = await getServerToken();
  if (!token) return null;
  try {
    const data = await apiFetch<{ user: AuthUser }>("/api/auth/me", { token });
    return data.user;
  } catch {
    return null;
  }
}

export async function requireUser(locale = "en") {
  const user = await getServerUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role === "STUDENT" && user.blocked) {
    redirect(`/${locale}/blocked`);
  }
  if (user.role === "STUDENT" && !user.approved) {
    redirect(`/${locale}/pending`);
  }
  return user;
}

export async function requireRole(
  role: AuthUser["role"] | AuthUser["role"][],
  locale = "en"
) {
  const user = await requireUser(locale);
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(user.role)) {
    redirect(`/${locale}/dashboard`);
  }
  return user;
}

/** Allow pending students (pending page / status checks). */
export async function requireUserAllowPending(locale = "en") {
  const user = await getServerUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}
