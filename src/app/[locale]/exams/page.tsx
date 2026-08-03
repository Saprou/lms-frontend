import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Pagination, type PaginationMeta } from "@/components/ui/pagination";
import { requireUser } from "@/lib/auth";
import { serverApi } from "@/lib/api-server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

function formatDate(d: string | null, locale: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type ExamListItem = {
  id: string;
  title: string;
  durationMin: number;
  opensAt: string | null;
  closesAt: string | null;
  course: { id: string; title: string } | null;
  level: { id: string; name: string } | null;
  _count: { questions: number; attempts: number };
  attempts?: {
    id: string;
    status: string;
    score: number | null;
    maxScore: number | null;
  }[];
};

export default async function ExamsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations("exam");
  const td = await getTranslations("dashboard");
  const tc = await getTranslations("common");

  const isInstructor = user.role === "INSTRUCTOR";
  const now = new Date();
  const page = Math.max(1, Number(pageParam) || 1);

  const { exams, pagination } = await serverApi<{
    exams: ExamListItem[];
    pagination: PaginationMeta;
  }>(`/api/exams?page=${page}&limit=12`);

  let gradingByExam: Record<string, { id: string; userName: string }[]> = {};
  if (isInstructor) {
    try {
      const dashboard = await serverApi<{
        attemptsNeedingGrading: {
          id: string;
          exam: { id: string };
          user: { name: string };
        }[];
      }>("/api/dashboard");
      for (const a of dashboard.attemptsNeedingGrading ?? []) {
        if (!gradingByExam[a.exam.id]) gradingByExam[a.exam.id] = [];
        gradingByExam[a.exam.id].push({ id: a.id, userName: a.user.name });
      }
    } catch {
      gradingByExam = {};
    }
  }

  const pager = (
    <Pagination
      pagination={pagination}
      hrefForPage={(p) => `/${locale}/exams?page=${p}`}
    />
  );

  if (isInstructor) {
    return (
      <AppShell title={t("title")}>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted">{t("review")}</p>
          <Link href={`/${locale}/exams/new`} className="btn btn-primary">
            <Plus className="h-4 w-4" />
            {t("create")}
          </Link>
        </div>

        {exams.length === 0 ? (
          <div className="card p-12 text-center text-muted">{tc("noResults")}</div>
        ) : (
          <>
            <div className="grid gap-4">
              {exams.map((exam) => (
                <div key={exam.id} className="card p-5 md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/${locale}/exams/${exam.id}`}
                        className="text-lg font-bold hover:text-primary"
                      >
                        {exam.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted">
                        {exam.level?.name}
                        {exam.course ? ` · ${exam.course.title}` : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {t("duration", { minutes: exam.durationMin })}
                        </span>
                        <span>
                          {exam._count.questions} questions · {exam._count.attempts}{" "}
                          attempts
                        </span>
                        {exam.opensAt && (
                          <span>
                            {t("opensAt", { date: formatDate(exam.opensAt, locale) })}
                          </span>
                        )}
                        {exam.closesAt && (
                          <span>
                            {t("closesAt", { date: formatDate(exam.closesAt, locale) })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/${locale}/exams/${exam.id}`}
                        className="btn btn-secondary"
                      >
                        {t("details")}
                      </Link>
                      {(gradingByExam[exam.id] ?? []).map((a) => (
                        <Link
                          key={a.id}
                          href={`/${locale}/exams/attempts/${a.id}/grade`}
                          className="btn btn-secondary text-xs"
                        >
                          {a.userName}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {pager}
          </>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell title={t("title")}>
      <div className="mb-6">
        <p className="text-muted">{td("upcomingExams")}</p>
      </div>

      {exams.length === 0 ? (
        <div className="card p-12 text-center text-muted">{tc("noResults")}</div>
      ) : (
        <>
          <div className="grid gap-4">
            {exams.map((exam) => {
              const userAttempt = exam.attempts?.[0];
              const opensAt = exam.opensAt ? new Date(exam.opensAt) : null;
              const closesAt = exam.closesAt ? new Date(exam.closesAt) : null;
              const isOpen =
                (!opensAt || opensAt <= now) && (!closesAt || closesAt >= now);

              return (
                <div key={exam.id} className="card p-5 md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/${locale}/exams/${exam.id}`}
                        className="text-lg font-bold hover:text-primary"
                      >
                        {exam.title}
                      </Link>
                      <p className="mt-1 text-sm text-muted">
                        {exam.level?.name}
                        {exam.course ? ` · ${exam.course.title}` : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {t("duration", { minutes: exam.durationMin })}
                        </span>
                        {exam.opensAt && (
                          <span>
                            {t("opensAt", { date: formatDate(exam.opensAt, locale) })}
                          </span>
                        )}
                        {exam.closesAt && (
                          <span>
                            {t("closesAt", { date: formatDate(exam.closesAt, locale) })}
                          </span>
                        )}
                      </div>
                      {userAttempt && (
                        <p className="mt-2 text-sm font-medium">
                          {userAttempt.status === "RELEASED" && userAttempt.score != null
                            ? t("grade", {
                                score: userAttempt.score,
                                max: userAttempt.maxScore ?? 0,
                              })
                            : userAttempt.status === "SUBMITTED"
                              ? t("submitted")
                              : userAttempt.status === "IN_PROGRESS"
                                ? t("inProgress")
                                : null}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {isOpen && (
                        <Link
                          href={`/${locale}/exams/${exam.id}/take`}
                          className="btn btn-exam"
                        >
                          {t("take")}
                        </Link>
                      )}
                      {!isOpen && opensAt && opensAt > now && (
                        <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-muted">
                          {t("notOpen")}
                        </span>
                      )}
                      {!isOpen && closesAt && closesAt < now && (
                        <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-muted">
                          {t("closed")}
                        </span>
                      )}
                      <Link
                        href={`/${locale}/exams/${exam.id}`}
                        className="btn btn-secondary"
                      >
                        {t("details")}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {pager}
        </>
      )}
    </AppShell>
  );
}
