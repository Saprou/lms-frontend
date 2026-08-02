import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  BookOpen,
  ClipboardList,
  MessageSquare,
  UsersRound,
  GraduationCap,
  CalendarDays,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth";
import { serverApi } from "@/lib/api-server";

type Props = { params: Promise<{ locale: string }> };

type InstructorDashboard = {
  role: "INSTRUCTOR";
  courses: {
    id: string;
    title: string;
    _count: { enrollments: number };
  }[];
  attemptsNeedingGrading: {
    id: string;
    user: { name: string };
    exam: { id: string; title: string };
  }[];
  upcomingExams: {
    id: string;
    title: string;
    course: { title: string };
  }[];
  recentMessages: {
    id: string;
    body: string;
    sender: { name: string };
  }[];
  communityPosts: {
    id: string;
    title: string;
    _count: { replies: number };
  }[];
};

type StudentDashboard = {
  role: "STUDENT";
  progressSummary: {
    courseId: string;
    courseTitle: string;
    totalLessons: number;
    completedLessons: number;
    percent: number;
  }[];
  quizAttempts: {
    id: string;
    score: number;
    maxScore: number;
    quiz: { title: string };
  }[];
  upcomingExams: {
    id: string;
    title: string;
    course: { title: string };
  }[];
  recentMessages: {
    id: string;
    body: string;
    sender: { name: string };
  }[];
  communityPosts: {
    id: string;
    title: string;
    _count: { replies: number };
  }[];
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");

  const data = await serverApi<InstructorDashboard | StudentDashboard>("/api/dashboard");

  if (data.role === "INSTRUCTOR") {
    const { courses, attemptsNeedingGrading, upcomingExams, recentMessages, communityPosts } =
      data;

    return (
      <AppShell title={t("title")}>
        <p className="mb-6 text-muted">
          {t("greeting", { name: user.name ?? "Instructor" })}
        </p>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <section className="card p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold">
                <BookOpen className="h-5 w-5 text-primary" />
                {t("teaching")}
              </h2>
              <Link href={`/${locale}/courses/new`} className="text-sm text-primary">
                {tc("create")}
              </Link>
            </div>
            {courses.length === 0 ? (
              <p className="text-sm text-muted">{tc("noResults")}</p>
            ) : (
              <div className="space-y-3">
                {courses.slice(0, 6).map((c) => (
                  <Link
                    key={c.id}
                    href={`/${locale}/courses/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-gray-50"
                  >
                    <span className="font-medium">{c.title}</span>
                    <span className="text-xs text-muted">
                      {c._count.enrollments} {t("students").toLowerCase()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 flex items-center gap-2 font-bold">
              <ClipboardList className="h-5 w-5 text-exam-blue" />
              {t("gradingQueue")}
            </h2>
            {attemptsNeedingGrading.length === 0 ? (
              <p className="text-sm text-muted">{tc("noResults")}</p>
            ) : (
              <div className="space-y-2">
                {attemptsNeedingGrading.map((a) => (
                  <Link
                    key={a.id}
                    href={`/${locale}/exams/attempts/${a.id}/grade`}
                    className="block rounded-lg bg-exam-blue-soft px-3 py-2 text-sm hover:opacity-90"
                  >
                    <span className="font-medium">{a.user.name}</span>
                    <span className="text-muted"> — {a.exam.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold">
                <GraduationCap className="h-5 w-5 text-primary" />
                {t("upcomingExams")}
              </h2>
              <Link href={`/${locale}/exams`} className="text-sm text-primary">
                {tc("viewAll")}
              </Link>
            </div>
            {upcomingExams.length === 0 ? (
              <p className="text-sm text-muted">{tc("noResults")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {upcomingExams.map((e) => (
                  <li key={e.id}>
                    <Link href={`/${locale}/exams/${e.id}`} className="hover:text-primary">
                      {e.title}
                    </Link>
                    <span className="text-muted"> · {e.course.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold">
                <MessageSquare className="h-5 w-5 text-primary" />
                {t("recentMessages")}
              </h2>
              <Link href={`/${locale}/messages`} className="text-sm text-primary">
                {tc("viewAll")}
              </Link>
            </div>
            {recentMessages.length === 0 ? (
              <p className="text-sm text-muted">{tc("noResults")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentMessages.map((m) => (
                  <li key={m.id} className="truncate">
                    <span className="font-medium">{m.sender.name}: </span>
                    {m.body.slice(0, 60)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold">
                <UsersRound className="h-5 w-5 text-primary" />
                {t("communityActivity")}
              </h2>
              <Link href={`/${locale}/community`} className="text-sm text-primary">
                {tc("viewAll")}
              </Link>
            </div>
            {communityPosts.length === 0 ? (
              <p className="text-sm text-muted">{tc("noResults")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {communityPosts.map((p) => (
                  <li key={p.id}>
                    <span className="font-medium">{p.title}</span>
                    <span className="text-muted">
                      {" "}
                      · {p._count.replies} replies
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </AppShell>
    );
  }

  const { progressSummary, quizAttempts, upcomingExams } = data;

  return (
    <AppShell title={t("title")}>
      <p className="mb-6 text-muted">
        {t("greeting", { name: user.name ?? "Student" })}
      </p>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <BookOpen className="h-5 w-5 text-primary" />
              {t("continueLearning")}
            </h2>
            <Link href={`/${locale}/courses`} className="text-sm text-primary">
              {t("browseCta")}
            </Link>
          </div>
          {progressSummary.length === 0 ? (
            <div className="text-center">
              <p className="text-sm text-muted">{t("noCourses")}</p>
              <Link href={`/${locale}/courses`} className="btn btn-primary mt-4">
                {t("browseCta")}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {progressSummary.slice(0, 6).map((p) => (
                <Link
                  key={p.courseId}
                  href={`/${locale}/courses/${p.courseId}`}
                  className="block rounded-lg border border-border p-4 hover:bg-gray-50"
                >
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium">{p.courseTitle}</span>
                    <span className="text-muted">{p.percent}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${p.percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {p.completedLessons}/{p.totalLessons} lessons
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <GraduationCap className="h-5 w-5 text-exam-blue" />
              {t("upcomingExams")}
            </h2>
            <Link href={`/${locale}/exams`} className="text-sm text-primary">
              {tc("viewAll")}
            </Link>
          </div>
          {upcomingExams.length === 0 ? (
            <p className="text-sm text-muted">{tc("noResults")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcomingExams.map((e) => (
                <li key={e.id}>
                  <Link href={`/${locale}/exams/${e.id}`} className="font-medium hover:text-primary">
                    {e.title}
                  </Link>
                  <p className="text-xs text-muted">{e.course.title}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <ClipboardList className="h-5 w-5 text-primary" />
            {t("quizScores")}
          </h2>
          {quizAttempts.length === 0 ? (
            <p className="text-sm text-muted">{tc("noResults")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {quizAttempts.map((a) => (
                <li key={a.id} className="flex justify-between">
                  <span>{a.quiz.title}</span>
                  <span className="font-semibold text-primary">
                    {a.score}/{a.maxScore}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <CalendarDays className="h-5 w-5 text-primary" />
              Calendar
            </h2>
            <Link href={`/${locale}/calendar`} className="text-sm text-primary">
              {tc("viewAll")}
            </Link>
          </div>
          <Link href={`/${locale}/calendar`} className="text-sm text-primary">
            View upcoming events →
          </Link>
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <MessageSquare className="h-5 w-5 text-primary" />
              {t("recentMessages")}
            </h2>
            <Link href={`/${locale}/messages`} className="text-sm text-primary">
              {tc("viewAll")}
            </Link>
          </div>
          <Link href={`/${locale}/messages`} className="text-sm text-primary">
            Open inbox →
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
