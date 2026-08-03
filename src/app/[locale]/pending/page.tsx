"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Clock, GraduationCap } from "lucide-react";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { useAuth } from "@/components/providers/auth-provider";

export default function PendingApprovalPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { user, loading, logout, refresh } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/${locale}/login`);
      return;
    }
    if (user.role !== "STUDENT") {
      router.replace(`/${locale}/dashboard`);
      return;
    }
    if (user.blocked) {
      router.replace(`/${locale}/blocked`);
      return;
    }
    if (user.approved) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [user, loading, locale, router]);

  useEffect(() => {
    const id = setInterval(() => {
      refresh();
    }, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  function handleLogout() {
    logout();
    router.push(`/${locale}/login`);
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        {tc("loading")}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">{tc("appName")}</span>
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <button type="button" className="btn btn-secondary" onClick={handleLogout}>
            {tc("logout")}
          </button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="card w-full max-w-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Clock className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t("pendingTitle")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {t("pendingBody")}
          </p>
          {user.level?.name && (
            <p className="mt-4 text-sm font-medium">
              {t("level")}: {user.level.name}
            </p>
          )}
          <p className="mt-6 text-xs text-muted">{t("pendingHint")}</p>
          <button
            type="button"
            className="btn btn-secondary mt-6"
            onClick={() => refresh()}
          >
            {t("checkStatus")}
          </button>
        </div>
      </div>
    </div>
  );
}
