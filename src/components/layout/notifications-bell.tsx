"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { clientApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import type { PaginationMeta } from "@/components/ui/pagination";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsBell() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (currentPage = 1, append = false) => {
      if (!user) return;
      try {
        const data = await clientApi<{
          notifications: NotificationItem[];
          unreadCount: number;
          pagination: PaginationMeta;
        }>(`/api/notifications?page=${currentPage}&limit=20`);
        setItems((prev) =>
          append
            ? [...prev, ...(data.notifications ?? [])]
            : (data.notifications ?? [])
        );
        setUnreadCount(data.unreadCount ?? 0);
        setHasMore(data.pagination?.hasMore ?? false);
        setPage(currentPage);
      } catch {
        // ignore polling errors
      }
    },
    [user]
  );

  useEffect(() => {
    load(1, false);
    const id = setInterval(() => {
      if (!open) load(1, false);
    }, 20000);
    return () => clearInterval(id);
  }, [load, open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      await load(1, false);
      setLoading(false);
    }
  }

  async function loadMore() {
    setLoading(true);
    await load(page + 1, true);
    setLoading(false);
  }

  async function markRead(id: string) {
    try {
      await clientApi(`/api/notifications/${id}/read`, { method: "POST" });
      setItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  async function markAllRead() {
    try {
      await clientApi("/api/notifications/read-all", { method: "POST" });
      setItems((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  if (!user) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative rounded-full border border-border bg-white p-2 text-muted hover:bg-gray-50"
        onClick={toggleOpen}
        aria-label={t("title")}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-semibold">{t("title")}</p>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={markAllRead}
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t("loading")}</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t("empty")}</p>
            ) : (
              <ul>
                {items.map((n) => {
                  const href = n.href ? `/${locale}${n.href}` : null;
                  const content = (
                    <>
                      <p className="text-sm font-semibold leading-snug">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted">
                        {new Date(n.createdAt).toLocaleString(
                          locale === "ar" ? "ar" : "en",
                          { dateStyle: "short", timeStyle: "short" }
                        )}
                      </p>
                    </>
                  );

                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "border-b border-border last:border-0",
                        !n.readAt && "bg-primary-soft/40"
                      )}
                    >
                      {href ? (
                        <Link
                          href={href}
                          className="block px-4 py-3 hover:bg-gray-50"
                          onClick={() => {
                            if (!n.readAt) markRead(n.id);
                            setOpen(false);
                          }}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="block w-full px-4 py-3 text-start hover:bg-gray-50"
                          onClick={() => {
                            if (!n.readAt) markRead(n.id);
                          }}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {hasMore && (
              <div className="border-t border-border p-2">
                <button
                  type="button"
                  className="w-full rounded-lg py-2 text-xs font-medium text-primary hover:bg-gray-50"
                  disabled={loading}
                  onClick={loadMore}
                >
                  {loading ? t("loading") : t("loadMore")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
