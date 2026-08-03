"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import { Pagination, type PaginationMeta } from "@/components/ui/pagination";
import { clientApi } from "@/lib/api-client";

type Event = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  course: { id: string; title: string } | null;
  createdBy: { id: string; name: string };
};

const emptyPagination: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

export function CalendarView({ initialEvents }: { initialEvents?: Event[] }) {
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [events, setEvents] = useState<Event[]>(initialEvents ?? []);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(!initialEvents);
  const [creating, setCreating] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadEvents = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const data = await clientApi<{
        events: Event[];
        pagination: PaginationMeta;
      }>(`/api/calendar?page=${currentPage}&limit=20`);
      setEvents(data.events ?? []);
      setPagination(data.pagination ?? emptyPagination);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialEvents && page === 1) {
      setLoading(false);
      return;
    }
    loadEvents(page);
  }, [initialEvents, page, loadEvents]);

  function formatDate(iso: string) {
    if (!mounted) return iso.slice(0, 16).replace("T", " ");
    return new Date(iso).toLocaleString(locale === "ar" ? "ar" : "en", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await clientApi<{ event: Event }>("/api/calendar", {
        method: "POST",
        json: {
          title,
          description: description || undefined,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        },
      });
      toast.success(t("create"));
      setShowForm(false);
      setTitle("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
      if (page === 1) await loadEvents(1);
      else setPage(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <div className="card p-12 text-center text-muted">{tc("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4" />
          {t("create")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-4 p-6">
          <div>
            <label className="label">{t("eventTitle")}</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t("startsAt")}</label>
              <input
                type="datetime-local"
                className="input"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">{t("endsAt")}</label>
              <input
                type="datetime-local"
                className="input"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? tc("loading") : tc("save")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowForm(false)}
            >
              {tc("cancel")}
            </button>
          </div>
        </form>
      )}

      <section>
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <CalendarDays className="h-5 w-5 text-primary" />
          {t("upcoming")}
        </h2>
        {events.length === 0 ? (
          <div className="card p-8 text-center text-muted">{t("noEvents")}</div>
        ) : (
          <>
            <div className="space-y-3">
              {events.map((ev) => (
                <div key={ev.id} className="card p-5">
                  <h3 className="font-bold">{ev.title}</h3>
                  {ev.description && (
                    <p className="mt-1 text-sm text-muted">{ev.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
                    <span>
                      {t("startsAt")}: {formatDate(ev.startsAt)}
                    </span>
                    <span>
                      {t("endsAt")}: {formatDate(ev.endsAt)}
                    </span>
                    {ev.course && <span>{ev.course.title}</span>}
                  </div>
                </div>
              ))}
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
