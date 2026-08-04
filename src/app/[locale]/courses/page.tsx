import Link from "next/link";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Pagination, type PaginationMeta } from "@/components/ui/pagination";
import { serverApi } from "@/lib/api-server";
import { initials } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

type CourseListItem = {
  id: string;
  title: string;
  coverUrl: string | null;
  instructor: { id: string; name: string; image: string | null };
  level?: { id: string; name: string } | null;
  _count: { enrollments: number };
};

export default async function CoursesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("courses");
  const tc = await getTranslations("common");

  const page = Math.max(1, Number(pageParam) || 1);
  const { courses, pagination } = await serverApi<{
    courses: CourseListItem[];
    pagination: PaginationMeta;
  }>(`/api/courses?page=${page}&limit=12`);

  return (
    <AppShell title={t("title")}>
      <div className="mb-6">
        <p className="text-muted">{t("browse")}</p>
      </div>

      {courses.length === 0 ? (
        <div className="card p-12 text-center text-muted">{tc("noResults")}</div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/${locale}/courses/${course.id}`}
                className="card group overflow-hidden transition hover:shadow-md"
              >
                <div className="relative aspect-video bg-primary-soft">
                  {course.coverUrl ? (
                    <Image
                      src={course.coverUrl}
                      alt={course.title}
                      fill
                      className="object-cover"
                      unoptimized={course.coverUrl.startsWith("/uploads")}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-primary">
                      <span className="text-4xl font-bold opacity-30">
                        {course.title.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  {course.level && (
                    <span className="mb-2 inline-block rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {course.level.name}
                    </span>
                  )}
                  <h2 className="font-bold group-hover:text-primary">{course.title}</h2>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {initials(course.instructor.name)}
                    </div>
                    <span className="text-sm text-muted">{course.instructor.name}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-sm text-muted">
                    <Users className="h-4 w-4" />
                    {t("studentsEnrolled", { count: course._count.enrollments })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Pagination
            pagination={pagination}
            hrefBase={`/${locale}/courses`}
          />
        </>
      )}
    </AppShell>
  );
}
