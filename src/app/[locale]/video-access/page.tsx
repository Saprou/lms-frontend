"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ShieldAlert, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { clientApi } from "@/lib/api-client";
import { Pagination } from "@/components/ui/pagination";

type AccessLog = {
  id: string;
  createdAt: string;
  ipAddress: string;
  userAgent: string | null;
  suspicious: boolean;
  student: { id: string; name: string; email: string };
  lessonId: string;
  lessonTitle: string | null;
  courseId: string;
  courseTitle: string | null;
  blockId: string | null;
};

type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function VideoAccessPage() {
  const t = useTranslations("videoAccess");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const data = await clientApi<{
        logs: AccessLog[];
        pagination: PaginationMeta;
      }>(`/api/video-access/suspicious?page=${currentPage}&limit=20`);
      setLogs(data.logs ?? []);
      setPagination(
        data.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 }
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== "INSTRUCTOR") {
      router.replace(`/${locale}/dashboard`);
      return;
    }
    load(page);
  }, [authLoading, user?.role, locale, router, page, load]);

  return (
    <AppShell title={t("title")}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
              {t("title")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => load(page)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <p className="p-6 text-sm text-muted">{tc("loading")}</p>
          ) : logs.length === 0 ? (
            <p className="p-6 text-sm text-muted">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-start text-sm">
                <thead className="border-b border-border bg-gray-50 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">{t("colStudent")}</th>
                    <th className="px-4 py-3 font-semibold">{t("colCourse")}</th>
                    <th className="px-4 py-3 font-semibold">{t("colLesson")}</th>
                    <th className="px-4 py-3 font-semibold">{t("colIp")}</th>
                    <th className="px-4 py-3 font-semibold">{t("colTime")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-primary-soft/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{log.student.name}</div>
                        <div className="text-xs text-muted">{log.student.email}</div>
                      </td>
                      <td className="px-4 py-3">{log.courseTitle ?? log.courseId}</td>
                      <td className="px-4 py-3">{log.lessonTitle ?? log.lessonId}</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.ipAddress}</td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(log.createdAt).toLocaleString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-border px-4 py-3">
            <Pagination
              pagination={{
                page: pagination.page,
                limit: pagination.pageSize,
                total: pagination.total,
                totalPages: pagination.totalPages,
                hasMore: pagination.page < pagination.totalPages,
              }}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
