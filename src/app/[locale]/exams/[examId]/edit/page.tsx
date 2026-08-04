import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { NewExamForm, type ExamFormInitial } from "@/components/exam/new-exam-form";
import { getServerUser, requireRole } from "@/lib/auth";
import { serverApi } from "@/lib/api-server";

type Props = { params: Promise<{ locale: string; examId: string }> };

export default async function EditExamPage({ params }: Props) {
  const { locale, examId } = await params;
  setRequestLocale(locale);

  await requireRole("INSTRUCTOR", locale);
  const user = await getServerUser();
  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("exam");

  let examData;
  try {
    examData = await serverApi<{
      exam: ExamFormInitial & {
        instructorId: string;
        level: { id: string } | null;
        course: { id: string } | null;
        questions: ExamFormInitial["questions"];
      };
      pagination?: { total: number };
    }>(`/api/exams/${examId}?page=1&limit=1`);
  } catch {
    notFound();
  }

  if (examData.exam.instructorId !== user.id) {
    redirect(`/${locale}/exams/${examId}`);
  }

  const [{ levels }, dashboard] = await Promise.all([
    serverApi<{
      levels: { id: string; name: string; description: string | null }[];
    }>("/api/levels"),
    serverApi<{
      courses: { id: string; title: string; levelId?: string | null }[];
    }>("/api/dashboard"),
  ]);

  const courses = dashboard.courses.map((c) => ({
    id: c.id,
    title: c.title,
    levelId: c.levelId ?? null,
  }));

  const exam = examData.exam;
  const attemptCount = examData.pagination?.total ?? 0;

  const initialExam: ExamFormInitial = {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    passage: exam.passage,
    durationMin: exam.durationMin,
    opensAt: exam.opensAt,
    closesAt: exam.closesAt,
    levelId: exam.levelId ?? exam.level?.id ?? "",
    courseId: exam.courseId ?? exam.course?.id ?? null,
    attemptCount,
    questions: exam.questions,
  };

  return (
    <AppShell title={t("edit")}>
      <NewExamForm
        levels={levels}
        courses={courses}
        initialExam={initialExam}
      />
    </AppShell>
  );
}
