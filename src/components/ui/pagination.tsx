"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

type Props = {
  pagination: PaginationMeta;
  onPageChange?: (page: number) => void;
  /** For server-rendered pages: build href for a page number */
  hrefForPage?: (page: number) => string;
  className?: string;
};

export function Pagination({
  pagination,
  onPageChange,
  hrefForPage,
  className,
}: Props) {
  const t = useTranslations("pagination");
  const { page, totalPages, total } = pagination;

  if (total === 0 || totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  function go(next: number) {
    if (next < 1 || next > totalPages) return;
    onPageChange?.(next);
  }

  const pages = visiblePages(page, totalPages);

  return (
    <div
      className={cn(
        "mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row",
        className
      )}
    >
      <p className="text-sm text-muted">
        {t("showing", { page, totalPages, total })}
      </p>
      <div className="flex items-center gap-1">
        {hrefForPage ? (
          <a
            href={canPrev ? hrefForPage(page - 1) : undefined}
            aria-disabled={!canPrev}
            className={cn(
              "btn btn-secondary px-2.5 py-1.5 text-sm",
              !canPrev && "pointer-events-none opacity-40"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("prev")}
          </a>
        ) : (
          <button
            type="button"
            className="btn btn-secondary px-2.5 py-1.5 text-sm"
            disabled={!canPrev}
            onClick={() => go(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            {t("prev")}
          </button>
        )}

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-1 text-muted">
              …
            </span>
          ) : hrefForPage ? (
            <a
              key={p}
              href={hrefForPage(p)}
              className={cn(
                "flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium",
                p === page
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-gray-100"
              )}
            >
              {p}
            </a>
          ) : (
            <button
              key={p}
              type="button"
              className={cn(
                "flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium",
                p === page
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-gray-100"
              )}
              onClick={() => go(p)}
            >
              {p}
            </button>
          )
        )}

        {hrefForPage ? (
          <a
            href={canNext ? hrefForPage(page + 1) : undefined}
            aria-disabled={!canNext}
            className={cn(
              "btn btn-secondary px-2.5 py-1.5 text-sm",
              !canNext && "pointer-events-none opacity-40"
            )}
          >
            {t("next")}
            <ChevronRight className="h-4 w-4" />
          </a>
        ) : (
          <button
            type="button"
            className="btn btn-secondary px-2.5 py-1.5 text-sm"
            disabled={!canNext}
            onClick={() => go(page + 1)}
          >
            {t("next")}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function visiblePages(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    set.add(2);
    set.add(3);
    set.add(4);
  }
  if (current >= total - 2) {
    set.add(total - 1);
    set.add(total - 2);
    set.add(total - 3);
  }
  const sorted = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("…");
    out.push(sorted[i]);
  }
  return out;
}
