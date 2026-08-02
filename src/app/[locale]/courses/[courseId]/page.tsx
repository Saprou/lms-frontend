import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ChevronRight,
  Clock,
  BookOpen,
  Share2,
  Play,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { EnrollButton } from "@/components/courses/enroll-button";
import { CourseContentAccordion } from "@/components/courses/course-content-accordion";
import { serverApi } from "@/lib/api-server";
import { initials } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; courseId: string }>;
};

function formatDuration(totalMin: number) {
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return { hours, minutes };
}

function findPreviewVideo(
  modules: {
    lessons: { blocks: { type: string; mediaUrl: string | null }[] }[];
  }[]
) {
  for (const mod of modules) {
    for (const lesson of mod.lessons) {
      const video = lesson.blocks.find(
        (b) => b.type === "VIDEO" && b.mediaUrl
      );
      if (video?.mediaUrl) return video.mediaUrl;
    }
  }
  return null;
}

export default async function CourseDetailPage({ params }: Props) {
  const { locale, courseId } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("courses");
  const tc = await getTranslations("common");

  let course;
  try {
    ({ course } = await serverApi<{
      course: {
        id: string;
        title: string;
        description: string;
        coverUrl: string | null;
        published: boolean;
        instructorId: string;
        instructor: { id: string; name: string; image: string | null; bio: string | null };
        modules: {
          id: string;
          title: string;
          order: number;
          lessons: {
            id: string;
            title: string;
            durationMin: number;
            order: number;
            blocks: { type: string; mediaUrl: string | null }[];
          }[];
        }[];
        _count: { enrollments: number };
        enrollments?: { id: string }[];
      };
    }>(`/api/courses/${courseId}`));
  } catch {
    notFound();
  }

  const enrolled = Array.isArray(course.enrollments) && course.enrollments.length > 0;
  const lessonCount = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );
  const totalMin = course.modules.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + l.durationMin, 0),
    0
  );
  const { hours, minutes } = formatDuration(totalMin);
  const previewVideo = findPreviewVideo(course.modules);

  const firstLesson = course.modules[0]?.lessons[0];

  const accordionModules = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    order: m.order,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      durationMin: l.durationMin,
      order: l.order,
    })),
  }));

  return (
    <AppShell>
      <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href={`/${locale}/courses`} className="hover:text-primary">
          {t("title")}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{course.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <span className="inline-block rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              {t("modules")} · {course.modules.length}
            </span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">{course.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {t("lessons", { count: lessonCount })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {t("duration", { hours, minutes })}
              </span>
              <span>{t("studentsEnrolled", { count: course._count.enrollments })}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-secondary">
              <Share2 className="h-4 w-4" />
              {tc("share")}
            </button>
            {enrolled && firstLesson ? (
              <Link
                href={`/${locale}/courses/${courseId}/lessons/${firstLesson.id}`}
                className="btn btn-primary"
              >
                <Play className="h-4 w-4" />
                {t("startLearning")}
              </Link>
            ) : (
              <EnrollButton courseId={courseId} enrolled={enrolled} />
            )}
          </div>

          <div className="overflow-hidden rounded-2xl bg-black">
            {previewVideo ? (
              <video
                src={previewVideo}
                controls
                className="aspect-video w-full"
                poster={course.coverUrl || undefined}
              />
            ) : course.coverUrl ? (
              <div className="relative aspect-video">
                <Image
                  src={course.coverUrl}
                  alt={course.title}
                  fill
                  className="object-cover"
                  unoptimized={course.coverUrl.startsWith("/uploads")}
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-primary-soft">
                <Play className="h-16 w-16 text-primary opacity-50" />
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="border-b border-border">
              <span className="inline-block border-b-2 border-primary px-1 pb-3 text-sm font-semibold text-primary">
                {t("overview")}
              </span>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-bold">{t("about")}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {course.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <CourseContentAccordion
            modules={accordionModules}
            courseId={courseId}
          />

          <div className="card p-5">
            <h3 className="font-bold">{t("author")}</h3>
            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {initials(course.instructor.name)}
              </div>
              <div>
                <p className="font-semibold">{course.instructor.name}</p>
                <p className="text-sm text-muted">{t("instructor")}</p>
                {course.instructor.bio && (
                  <p className="mt-2 text-sm text-muted">{course.instructor.bio}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
