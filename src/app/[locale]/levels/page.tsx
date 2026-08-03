"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Layers, Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { AppShell } from "@/components/layout/app-shell";
import { Pagination, type PaginationMeta } from "@/components/ui/pagination";
import { clientApi } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";

type Level = {
  id: string;
  name: string;
  description: string | null;
  order: number;
};

const emptyPagination: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasMore: false,
};

export default function LevelsPage() {
  const t = useTranslations("levels");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [levels, setLevels] = useState<Level[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

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

  async function loadLevels(currentPage = page) {
    setLoading(true);
    try {
      const data = await clientApi<{
        levels: Level[];
        pagination: PaginationMeta;
      }>(`/api/levels?page=${currentPage}&limit=20`);
      setLevels(data.levels ?? []);
      setPagination(data.pagination ?? emptyPagination);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === "INSTRUCTOR") loadLevels(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, page]);

  function resetForm() {
    setName("");
    setDescription("");
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await clientApi(`/api/levels/${editingId}`, {
          method: "PATCH",
          json: { name: name.trim(), description: description.trim() || null },
        });
        toast.success(t("updated"));
      } else {
        await clientApi("/api/levels", {
          method: "POST",
          json: { name: name.trim(), description: description.trim() || null },
        });
        toast.success(t("created"));
      }
      resetForm();
      await loadLevels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(level: Level) {
    setEditingId(level.id);
    setName(level.name);
    setDescription(level.description ?? "");
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await clientApi(`/api/levels/${id}`, { method: "DELETE" });
      toast.success(t("deleted"));
      if (editingId === id) resetForm();
      await loadLevels();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  if (authLoading || user?.role !== "INSTRUCTOR") {
    return (
      <AppShell title={t("title")}>
        <div className="card p-12 text-center text-muted">{tc("loading")}</div>
      </AppShell>
    );
  }

  return (
    <AppShell title={t("title")}>
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="card space-y-4 p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="font-bold">
              {editingId ? t("edit") : t("create")}
            </h2>
          </div>
          <div>
            <label className="label" htmlFor="level-name">
              {t("name")}
            </label>
            <input
              id="level-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label" htmlFor="level-desc">
              {t("description")}
            </label>
            <textarea
              id="level-desc"
              className="input min-h-[100px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Plus className="h-4 w-4" />
              {saving ? tc("loading") : editingId ? tc("save") : t("create")}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                {tc("cancel")}
              </button>
            )}
          </div>
        </form>

        <div className="lg:col-span-3">
          {loading ? (
            <div className="card p-12 text-center text-muted">{tc("loading")}</div>
          ) : levels.length === 0 ? (
            <div className="card p-12 text-center text-muted">{t("empty")}</div>
          ) : (
            <>
              <div className="space-y-3">
                {levels.map((level) => (
                  <div key={level.id} className="card flex items-start gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary">
                      {level.order + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold">{level.name}</h3>
                      {level.description && (
                        <p className="mt-1 text-sm text-muted">{level.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-muted hover:bg-primary-soft hover:text-primary"
                        onClick={() => startEdit(level)}
                        title={tc("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-danger"
                        onClick={() => handleDelete(level.id)}
                        title={tc("delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
