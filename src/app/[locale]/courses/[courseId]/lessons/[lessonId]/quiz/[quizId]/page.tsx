import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { QuizTaker } from "@/components/quiz/quiz-taker";
import { requireUser } from "@/lib/auth";
import { serverApi } from "@/lib/api-server";

type Props = {
  params: Promise<{
    locale: string;
    courseId: string;
    lessonId: string;
    quizId: string;
  }>;
};

export default async function QuizPage({ params }: Props) {
  const { locale, courseId, lessonId, quizId } = await params;
  setRequestLocale(locale);

  await requireUser(locale);

  const t = await getTranslations("quiz");
  const tc = await getTranslations("common");

  let lesson;
  try {
    ({ lesson } = await serverApi<{
      lesson: {
        id: string;
        module: { course: { id: string } };
        quizzes: {
          id: string;
          title: string;
          questions: {
            id: string;
            prompt: string;
            order: number;
            options: { id: string; text: string }[];
          }[];
        }[];
      };
    }>(`/api/lessons/${lessonId}`));
  } catch {
    notFound();
  }

  if (lesson.id !== lessonId || lesson.module.course.id !== courseId) {
    notFound();
  }

  const quiz = lesson.quizzes.find((q) => q.id === quizId);
  if (!quiz) {
    redirect(`/${locale}/courses/${courseId}/lessons/${lessonId}`);
  }

  const safeQuiz = {
    id: quiz.id,
    title: quiz.title,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      order: q.order,
      options: q.options.map(({ id, text }) => ({ id, text })),
    })),
  };

  return (
    <div className="quiz-gradient flex min-h-screen flex-col">
      <header className="flex items-center gap-4 px-4 py-4 md:px-8">
        <Link
          href={`/${locale}/courses/${courseId}/lessons/${lessonId}`}
          className="btn btn-secondary !py-2 !px-3"
        >
          <ChevronLeft className="h-4 w-4" />
          {tc("back")}
        </Link>
        <h1 className="text-lg font-bold">{t("title")}</h1>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-4 md:px-8">
        <QuizTaker quiz={safeQuiz} />
      </main>
    </div>
  );
}
