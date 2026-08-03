"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import toast from "react-hot-toast";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { useAuth } from "@/components/providers/auth-provider";
import { API_URL } from "@/lib/api-client";

type Level = {
  id: string;
  name: string;
  description: string | null;
};

export default function SignupPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [levelId, setLevelId] = useState("");
  const [levels, setLevels] = useState<Level[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/levels`)
      .then((r) => r.json())
      .then((d) => {
        const list = (d.levels ?? []) as Level[];
        setLevels(list);
        if (list[0]) setLevelId(list[0].id);
      })
      .catch(() => toast.error(t("levelsLoadError")))
      .finally(() => setLevelsLoading(false));
  }, [t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!levelId) {
      toast.error(t("levelRequired"));
      return;
    }
    setLoading(true);

    try {
      await signup({ name, email, phone, password, levelId });
      toast.success(t("pendingApprovalToast"));
      router.push(`/${locale}/pending`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
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
          <h1 className="text-2xl font-bold tracking-tight">{t("createAccount")}</h1>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="label">
                {t("name")}
              </label>
              <input
                id="name"
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="email" className="label">
                {t("email")}
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="phone" className="label">
                {t("phone")}
              </label>
              <input
                id="phone"
                type="tel"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
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
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="level" className="label">
                {t("level")}
              </label>
              <select
                id="level"
                className="input"
                value={levelId}
                onChange={(e) => setLevelId(e.target.value)}
                required
                disabled={levelsLoading || levels.length === 0}
              >
                {levelsLoading && <option value="">{tc("loading")}</option>}
                {!levelsLoading && levels.length === 0 && (
                  <option value="">{t("noLevels")}</option>
                )}
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
              {levelId && levels.find((l) => l.id === levelId)?.description && (
                <p className="mt-1.5 text-xs text-muted">
                  {levels.find((l) => l.id === levelId)?.description}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading || !levelId || levels.length === 0}
            >
              {loading ? tc("loading") : tc("signup")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {t("hasAccount")}{" "}
            <Link
              href={`/${locale}/login`}
              className="font-semibold text-primary hover:underline"
            >
              {tc("login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
