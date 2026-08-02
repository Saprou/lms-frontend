import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { LessonPlayer } from "@/components/player/lesson-player";
import { requireUser } from "@/lib/auth";
import { serverApi } from "@/lib/api-server";

type Props = {
  params: Promise<{ locale: string; courseId: string; lessonId: string }>;
};

export default async function LessonPage({ params }: Props) {
  const { locale, courseId, lessonId } = await params;
  setRequestLocale(locale);

  await requireUser(locale);

  let lessonData;
  let courseData;
  try {
    [{ lesson: lessonData }, { course: courseData }] = await Promise.all([
      serverApi<{
        lesson: {
          id: string;
          title: string;
          blocks: {
            id: string;
            type: "VIDEO" | "IMAGE" | "TEXT";
            content: string;
            mediaUrl: string | null;
            order: number;
          }[];
          quizzes: { id: string; title: string }[];
          module: { course: { id: string; title: string } };
        };
      }>(`/api/lessons/${lessonId}`),
      serverApi<{
        course: {
          modules: {
            id: string;
            title: string;
            order: number;
            lessons: {
              id: string;
              title: string;
              durationMin: number;
              progress?: { completed: boolean; watchPosition?: number }[];
            }[];
          }[];
        };
      }>(`/api/courses/${courseId}`),
    ]);
  } catch {
    notFound();
  }

  if (lessonData.module.course.id !== courseId) {
    notFound();
  }

  const currentLesson = courseData.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === lessonId);

  const progress = currentLesson?.progress?.[0];

  const modules = courseData.modules.map((m) => ({
    id: m.id,
    title: m.title,
    order: m.order,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      durationMin: l.durationMin,
      progress: l.progress,
    })),
  }));

  return (
    <AppShell>
      <LessonPlayer
        courseId={courseId}
        courseTitle={lessonData.module.course.title}
        lesson={{
          id: lessonData.id,
          title: lessonData.title,
          blocks: lessonData.blocks,
          quizzes: lessonData.quizzes,
        }}
        modules={modules}
        watchPosition={progress?.watchPosition ?? 0}
        completed={progress?.completed ?? false}
      />
    </AppShell>
  );
}
