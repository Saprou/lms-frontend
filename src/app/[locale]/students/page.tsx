"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { UserCheck, Check, X, Ban, Unlock, Search } from "lucide-react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/app-shell";
import { Pagination, type PaginationMeta } from "@/components/ui/pagination";
import { clientApi } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

type Student = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  approved: boolean;
  blocked: boolean;
  createdAt: string;
  level: { id: string; name: string } | null;
};

type Tab = "all" | "pending" | "active" | "blocked";

function studentStatus(s: Student): "pending" | "active" | "blocked" {
  if (s.blocked) return "blocked";
  if (!s.approved) return "pending";
  return "active";
}

const emptyPagination: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

export default function StudentsPage() {
  const t = useTranslations("students");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/${locale}/login`);
      return;
    }
    if (user.role !== "INSTRUCTOR") {
      router.replace(`/${locale}/dashboard`);
    }
  }, [authLoading, user, locale, router]);

  useEffect(() => {
    const id = setTimeout(() => {
      const next = searchInput.trim();
      setSearch((prev) => {
        if (prev === next) return prev;
        setPage(1);
        return next;
      });
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const load = useCallback(
    async (current: Tab, currentPage: number, query: string) => {
      setLoading(true);
      try {
        const path =
          current === "all"
            ? "/api/users/all"
            : current === "pending"
              ? "/api/users/pending"
              : current === "blocked"
                ? "/api/users/blocked"
                : "/api/users/students";
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: "20",
        });
        if (query) params.set("search", query);
        const data = await clientApi<{
          students: Student[];
          pagination: PaginationMeta;
        }>(`${path}?${params}`);
        setStudents(data.students ?? []);
        setPagination(data.pagination ?? emptyPagination);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (user?.role === "INSTRUCTOR") load(tab, page, search);
  }, [user?.role, tab, page, search, load]);

  function changeTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  async function approve(id: string) {
    setActingId(id);
    try {
      await clientApi(`/api/users/${id}/approve`, { method: "POST" });
      toast.success(t("approved"));
      await load(tab, page, search);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setActingId(null);
    }
  }

  async function reject(id: string) {
    if (!confirm(t("confirmReject"))) return;
    setActingId(id);
    try {
      await clientApi(`/api/users/${id}/reject`, { method: "POST" });
      toast.success(t("rejected"));
      await load(tab, page, search);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setActingId(null);
    }
  }

  async function block(id: string) {
    if (!confirm(t("confirmBlock"))) return;
    setActingId(id);
    try {
      await clientApi(`/api/users/${id}/block`, { method: "POST" });
      toast.success(t("blocked"));
      await load(tab, page, search);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setActingId(null);
    }
  }

  async function unblock(id: string) {
    setActingId(id);
    try {
      await clientApi(`/api/users/${id}/unblock`, { method: "POST" });
      toast.success(t("unblocked"));
      await load(tab, page, search);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setActingId(null);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: t("tabAll") },
    { id: "pending", label: t("tabPending") },
    { id: "active", label: t("tabActive") },
    { id: "blocked", label: t("tabBlocked") },
  ];

  const emptyMessage = search
    ? t("emptySearch")
    : tab === "all"
      ? t("emptyAll")
      : tab === "pending"
        ? t("empty")
        : tab === "blocked"
          ? t("emptyBlocked")
          : t("emptyActive");

  function statusLabel(status: ReturnType<typeof studentStatus>) {
    if (status === "pending") return t("statusPending");
    if (status === "blocked") return t("statusBlocked");
    return t("statusActive");
  }

  function renderActions(s: Student) {
    const status = studentStatus(s);
    if (status === "pending") {
      return (
        <>
          <button
            type="button"
            className="btn btn-primary"
            disabled={actingId === s.id}
            onClick={() => approve(s.id)}
          >
            <Check className="h-4 w-4" />
            {t("approve")}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={actingId === s.id}
            onClick={() => reject(s.id)}
          >
            <X className="h-4 w-4" />
            {t("reject")}
          </button>
        </>
      );
    }
    if (status === "active") {
      return (
        <button
          type="button"
          className="btn btn-secondary"
          disabled={actingId === s.id}
          onClick={() => block(s.id)}
        >
          <Ban className="h-4 w-4" />
          {t("block")}
        </button>
      );
    }
    return (
      <button
        type="button"
        className="btn btn-primary"
        disabled={actingId === s.id}
        onClick={() => unblock(s.id)}
      >
        <Unlock className="h-4 w-4" />
        {t("unblock")}
      </button>
    );
  }

  if (authLoading || user?.role !== "INSTRUCTOR") {
    return (
      <AppShell title={t("title")}>
        <p className="text-muted">{tc("loading")}</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("title")}>
      <p className="mb-4 text-muted">{t("subtitle")}</p>

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          className="input ps-9"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              tab === item.id
                ? "bg-primary text-white"
                : "bg-gray-100 text-muted hover:bg-gray-200"
            )}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">{tc("loading")}</p>
      ) : students.length === 0 ? (
        <div className="card p-12 text-center text-muted">{emptyMessage}</div>
      ) : (
        <>
          <div className="space-y-3">
            {students.map((s) => {
              const status = studentStatus(s);
              return (
                <div
                  key={s.id}
                  className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <UserCheck className="h-4 w-4 shrink-0 text-primary" />
                      <p className="font-semibold">{s.name}</p>
                      {tab === "all" && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            status === "pending" && "bg-amber-50 text-amber-700",
                            status === "active" && "bg-green-50 text-success",
                            status === "blocked" && "bg-red-50 text-danger"
                          )}
                        >
                          {statusLabel(status)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted">{s.email}</p>
                    {s.phone && (
                      <p className="mt-0.5 text-sm text-muted">{s.phone}</p>
                    )}
                    <p className="mt-1 text-xs text-muted">
                      {s.level?.name ?? "—"} ·{" "}
                      {new Date(s.createdAt).toLocaleString(
                        locale === "ar" ? "ar" : "en",
                        { dateStyle: "medium", timeStyle: "short" }
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {renderActions(s)}
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </AppShell>
  );
}
