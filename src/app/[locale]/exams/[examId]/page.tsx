import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { getServerUser } from "@/lib/auth";
import { serverApi } from "@/lib/api-server";

type Props = { params: Promise<{ locale: string; examId: string }> };

function formatDate(d: string | null, locale: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ExamDetailPage({ params }: Props) {
  const { locale, examId } = await params;
  setRequestLocale(locale);

  const user = await getServerUser();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("exam");
  const td = await getTranslations("dashboard");
  const tc = await getTranslations("common");

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
      attempts: {
        id: string;
        status: string;
        score: number | null;
        maxScore: number | null;
      }[];
    }>(`/api/exams/${examId}`);
  } catch {
    notFound();
  }

  const { exam, attempts } = examData;
  const isInstructor = exam.instructorId === user.id;

  const now = new Date();
  const opensAt = exam.opensAt ? new Date(exam.opensAt) : null;
  const closesAt = exam.closesAt ? new Date(exam.closesAt) : null;
  const isOpen =
    (!opensAt || opensAt <= now) && (!closesAt || closesAt >= now);
  const latestAttempt = attempts[0];
  const inProgress = latestAttempt?.status === "IN_PROGRESS";
  const maxPoints = exam.questions.reduce((s, q) => s + q.points, 0);

  let pendingGrading: { id: string; user: { name: string } }[] = [];
  if (isInstructor) {
    try {
      const dashboard = await serverApi<{
        attemptsNeedingGrading: {
          id: string;
          exam: { id: string };
          user: { name: string };
        }[];
      }>("/api/dashboard");
      pendingGrading = (dashboard.attemptsNeedingGrading ?? [])
        .filter((a) => a.exam.id === examId)
        .map((a) => ({ id: a.id, user: a.user }));
    } catch {
      pendingGrading = [];
    }
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
              {latestAttempt?.status === "RELEASED" && latestAttempt.score != null && (
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

        {isInstructor && pendingGrading.length > 0 && (
          <div className="card p-6">
            <h2 className="mb-4 font-bold">{td("gradingQueue")}</h2>
            <div className="space-y-2">
              {pendingGrading.map((a) => (
                <Link
                  key={a.id}
                  href={`/${locale}/exams/attempts/${a.id}/grade`}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-gray-50"
                >
                  <span className="font-medium">{a.user.name}</span>
                  <span className="text-sm text-primary">{t("review")}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link href={`/${locale}/exams`} className="btn btn-secondary">
          {tc("back")}
        </Link>
      </div>
    </AppShell>
  );
}
