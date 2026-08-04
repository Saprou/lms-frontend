import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Pagination, type PaginationMeta } from "@/components/ui/pagination";
import { getServerUser } from "@/lib/auth";
import { serverApi } from "@/lib/api-server";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; examId: string }>;
  searchParams: Promise<{ page?: string }>;
};

function formatDate(d: string | null, locale: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type AttemptRow = {
  id: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  startedAt: string;
  submittedAt: string | null;
  user?: { id: string; name: string; email: string };
};

export default async function ExamDetailPage({ params, searchParams }: Props) {
  const { locale, examId } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const user = await getServerUser();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("exam");
  const tc = await getTranslations("common");

  const page = Math.max(1, Number(pageParam) || 1);

  let examData;
  try {
    examData = await serverApi<{
      exam: {
        id: string;
        title: string;
        description: string | null;
        durationMin: number;
        opensAt: string | null;
        closesAt: string | null;
        instructorId: string;
        course: { id: string; title: string } | null;
        level: { id: string; name: string } | null;
        questions: { points: number }[];
      };
      attempts: AttemptRow[];
      pagination?: PaginationMeta;
    }>(`/api/exams/${examId}?page=${page}&limit=20`);
  } catch {
    notFound();
  }

  const { exam, attempts, pagination } = examData;
  const isInstructor = exam.instructorId === user.id;

  const now = new Date();
  const opensAt = exam.opensAt ? new Date(exam.opensAt) : null;
  const closesAt = exam.closesAt ? new Date(exam.closesAt) : null;
  const isOpen =
    (!opensAt || opensAt <= now) && (!closesAt || closesAt >= now);
  const latestAttempt = attempts[0];
  const inProgress = latestAttempt?.status === "IN_PROGRESS";
  const maxPoints = exam.questions.reduce((s, q) => s + q.points, 0);

  function statusLabel(status: string) {
    if (status === "IN_PROGRESS") return t("inProgress");
    if (status === "SUBMITTED") return t("submitted");
    if (status === "RELEASED") return t("released");
    return status;
  }

  return (
    <AppShell title={exam.title}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="card p-6">
          <p className="text-sm text-muted">
            {exam.level?.name}
            {exam.course ? ` · ${exam.course.title}` : ""}
          </p>
          {exam.description && (
            <p className="mt-3 text-sm leading-relaxed">{exam.description}</p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-exam-blue" />
              {t("duration", { minutes: exam.durationMin })}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-exam-blue" />
              {exam.questions.length} questions · {maxPoints} pts
            </div>
            {exam.opensAt && (
              <p className="text-sm text-muted">
                {t("opensAt", { date: formatDate(exam.opensAt, locale) })}
              </p>
            )}
            {exam.closesAt && (
              <p className="text-sm text-muted">
                {t("closesAt", { date: formatDate(exam.closesAt, locale) })}
              </p>
            )}
          </div>

          {isInstructor && (
            <div className="mt-6">
              <Link
                href={`/${locale}/exams/${examId}/edit`}
                className="btn btn-secondary"
              >
                {t("edit")}
              </Link>
            </div>
          )}

          {!isInstructor && (
            <div className="mt-6 flex flex-wrap gap-3">
              {isOpen && !latestAttempt?.status?.match(/SUBMITTED|RELEASED/) && (
                <Link
                  href={`/${locale}/exams/${examId}/take`}
                  className="btn btn-exam"
                >
                  {inProgress ? t("inProgress") : t("take")}
                </Link>
              )}
              {!isOpen && opensAt && opensAt > now && (
                <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-muted">
                  {t("notOpen")}
                </span>
              )}
              {!isOpen && closesAt && closesAt < now && (
                <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-muted">
                  {t("closed")}
                </span>
              )}
              {latestAttempt?.status === "SUBMITTED" && (
                <span className="rounded-lg bg-primary-soft px-4 py-2 text-sm font-medium text-primary">
                  {t("submitted")}
                </span>
              )}
              {latestAttempt?.status === "RELEASED" &&
                latestAttempt.score != null && (
                  <span className="rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-success">
                    {t("grade", {
                      score: latestAttempt.score,
                      max: latestAttempt.maxScore ?? maxPoints,
                    })}
                  </span>
                )}
            </div>
          )}
        </div>

        {isInstructor && (
          <div className="card p-6">
            <h2 className="mb-4 font-bold">{t("attempts")}</h2>
            {attempts.length === 0 ? (
              <p className="text-sm text-muted">{t("noAttempts")}</p>
            ) : (
              <>
                <div className="space-y-2">
                  {attempts.map((a) => {
                    const canReview =
                      a.status === "SUBMITTED" || a.status === "RELEASED";
                    return (
                      <div
                        key={a.id}
                        className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{a.user?.name ?? "—"}</p>
                          <p className="truncate text-xs text-muted">
                            {a.user?.email}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {a.submittedAt
                              ? formatDate(a.submittedAt, locale)
                              : formatDate(a.startedAt, locale)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              a.status === "IN_PROGRESS" &&
                                "bg-amber-50 text-amber-700",
                              a.status === "SUBMITTED" &&
                                "bg-primary-soft text-primary",
                              a.status === "RELEASED" &&
                                "bg-green-50 text-success"
                            )}
                          >
                            {statusLabel(a.status)}
                          </span>
                          {a.status === "RELEASED" && a.score != null && (
                            <span className="text-sm font-semibold">
                              {t("grade", {
                                score: a.score,
                                max: a.maxScore ?? maxPoints,
                              })}
                            </span>
                          )}
                          {canReview && (
                            <Link
                              href={`/${locale}/exams/attempts/${a.id}/grade`}
                              className="btn btn-secondary text-xs"
                            >
                              {t("review")}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {pagination && (
                  <Pagination
                    pagination={pagination}
                    hrefBase={`/${locale}/exams/${examId}`}
                  />
                )}
              </>
            )}
          </div>
        )}

        <Link href={`/${locale}/exams`} className="btn btn-secondary">
          {tc("back")}
        </Link>
      </div>
    </AppShell>
  );
}
