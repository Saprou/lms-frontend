"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import toast from "react-hot-toast";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { useAuth } from "@/components/providers/auth-provider";

export default function LoginPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(identifier, password);
      if (user.role === "STUDENT" && user.blocked) {
        router.push(`/${locale}/blocked`);
      } else if (user.role === "STUDENT" && !user.approved) {
        router.push(`/${locale}/pending`);
      } else {
        router.push(`/${locale}/dashboard`);
      }
      router.refresh();
    } catch {
      toast.error(t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
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
        <LocaleSwitcher />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="card w-full max-w-md p-8">
          <h1 className="text-2xl font-bold tracking-tight">{t("welcomeBack")}</h1>
          <p className="mt-1 text-sm text-muted">{t("demoHint")}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="identifier" className="label">
                {t("emailOrPhone")}
              </label>
              <input
                id="identifier"
                type="text"
                className="input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
                placeholder={t("emailOrPhonePlaceholder")}
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                {t("password")}
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? tc("loading") : tc("login")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t("noAccount")}{" "}
            <Link
              href={`/${locale}/signup`}
              className="font-semibold text-primary hover:underline"
            >
              {tc("signup")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
