"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  MessagesSquare,
  UsersRound,
  ClipboardList,
  Settings,
  LogOut,
  Plus,
  Bell,
  GraduationCap,
  Layers,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { LocaleSwitcher } from "./locale-switcher";
import { useAuth } from "@/components/providers/auth-provider";

const studentLinks = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/courses", icon: BookOpen, key: "courses" },
  { href: "/exams", icon: ClipboardList, key: "exams" },
  { href: "/calendar", icon: CalendarDays, key: "calendar" },
  { href: "/messages", icon: MessagesSquare, key: "messages" },
  { href: "/community", icon: UsersRound, key: "community" },
] as const;

const instructorLinks = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/courses", icon: BookOpen, key: "courses" },
  { href: "/levels", icon: Layers, key: "levels" },
  { href: "/exams", icon: ClipboardList, key: "exams" },
  { href: "/calendar", icon: CalendarDays, key: "calendar" },
  { href: "/messages", icon: MessagesSquare, key: "messages" },
  { href: "/community", icon: UsersRound, key: "community" },
] as const;

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const role = user?.role;
  const links = role === "INSTRUCTOR" ? instructorLinks : studentLinks;

  function handleLogout() {
    logout();
    router.push(`/${locale}/login`);
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-[72px] flex-col items-center border-e border-border bg-white py-4 lg:w-64 lg:items-stretch lg:px-4">
        <Link
          href={`/${locale}/dashboard`}
          className="mb-6 flex items-center gap-3 px-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="hidden lg:block">
            <p className="text-lg font-bold tracking-tight">{tc("appName")}</p>
            <p className="text-xs text-muted">LMS 3.2</p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {links.map((item) => {
            const href = `/${locale}${item.href}`;
            const active = pathname.startsWith(href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted hover:bg-gray-50 hover:text-foreground"
                )}
                title={t(item.key)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="hidden lg:inline">{t(item.key)}</span>
                {active && (
                  <span className="ms-auto hidden h-2 w-2 rounded-full bg-primary lg:inline-block" />
                )}
              </Link>
            );
          })}
        </nav>

        {role === "INSTRUCTOR" && (
          <Link
            href={`/${locale}/courses/new`}
            className="btn btn-primary mb-3 hidden lg:inline-flex"
          >
            <Plus className="h-4 w-4" />
            {t("createCourse")}
          </Link>
        )}

        <div className="mt-auto space-y-2 border-t border-border pt-3">
          <Link
            href={`/${locale}/dashboard`}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-gray-50"
          >
            <Settings className="h-5 w-5" />
            <span className="hidden lg:inline">{t("settings")}</span>
          </Link>
          {user && (
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {initials(user.name || "U")}
              </div>
              <div className="hidden min-w-0 flex-1 lg:block">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted">
                  {user.level?.name
                    ? `${user.role} · ${user.level.name}`
                    : user.role}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-muted hover:bg-white"
                title={tc("logout")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div>
            {title && (
              <h1 className="text-lg font-bold tracking-tight md:text-xl">
                {title}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <button
              type="button"
              className="relative rounded-full border border-border bg-white p-2 text-muted"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute end-1 top-1 h-2 w-2 rounded-full bg-danger" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
