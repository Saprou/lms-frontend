"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
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

export function CalendarView({ initialEvents }: { initialEvents?: Event[] }) {
  const t = useTranslations("calendar");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [events, setEvents] = useState<Event[]>(initialEvents ?? []);
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

  useEffect(() => {
    if (initialEvents) return;
    clientApi<{ events: Event[] }>("/api/calendar")
      .then((data) => setEvents(data.events ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [initialEvents]);

  const { upcoming, past } = useMemo(() => {
    // Stable split during SSR/hydration; refine after mount
    if (!mounted) {
      return { upcoming: events, past: [] as Event[] };
    }
    const now = Date.now();
    return {
      upcoming: events.filter((e) => new Date(e.endsAt).getTime() >= now),
      past: events.filter((e) => new Date(e.endsAt).getTime() < now),
    };
  }, [events, mounted]);

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
      const data = await clientApi<{ event: Event }>("/api/calendar", {
        method: "POST",
        json: {
          title,
          description: description || undefined,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        },
      });
      setEvents((prev) =>
        [...prev, data.event].sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        )
      );
      toast.success(t("create"));
      setShowForm(false);
      setTitle("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
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
        {upcoming.length === 0 ? (
          <div className="card p-8 text-center text-muted">{t("noEvents")}</div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((ev) => (
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
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold text-muted">Past events</h2>
          <div className="space-y-2 opacity-70">
            {past.slice(0, 5).map((ev) => (
              <div key={ev.id} className="rounded-lg border border-border px-4 py-3 text-sm">
                {ev.title} · {formatDate(ev.startsAt)}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
