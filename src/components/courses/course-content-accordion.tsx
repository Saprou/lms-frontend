"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Lesson = {
  id: string;
  title: string;
  durationMin: number;
  order: number;
};

type Module = {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
};

type Props = {
  modules: Module[];
  courseId: string;
  currentLessonId?: string;
  completedLessonIds?: string[];
  /** When false, lesson rows are listed but not clickable */
  canAccessLessons?: boolean;
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function CourseContentAccordion({
  modules,
  courseId,
  currentLessonId,
  completedLessonIds = [],
  canAccessLessons = true,
}: Props) {
  const t = useTranslations("courses");
  const locale = useLocale();
  const [openModules, setOpenModules] = useState<Set<string>>(
    () => new Set(modules.length > 0 ? [modules[0].id] : [])
  );

  function toggleModule(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalDuration = modules.reduce(
    (sum, m) => sum + m.lessons.reduce((s, l) => s + l.durationMin, 0),
    0
  );

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-bold">{t("courseContent")}</h3>
        <p className="mt-1 text-sm text-muted">
          {t("modules")}: {modules.length} · {t("lessons", { count: totalLessons })} ·{" "}
          {formatDuration(totalDuration)}
        </p>
      </div>

      <div className="divide-y divide-border">
        {modules.map((module, moduleIndex) => {
          const isOpen = openModules.has(module.id);
          const moduleDuration = module.lessons.reduce(
            (s, l) => s + l.durationMin,
            0
          );

          return (
            <div key={module.id}>
              <button
                type="button"
                onClick={() => toggleModule(module.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-start transition hover:bg-gray-50"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted transition",
                    isOpen && "rotate-180"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {moduleIndex + 1}. {module.title}
                  </p>
                  <p className="text-xs text-muted">
                    {module.lessons.length} lessons · {formatDuration(moduleDuration)}
                  </p>
                </div>
              </button>

              {isOpen && (
                <ul className="border-t border-border bg-gray-50/50 pb-2">
                  {module.lessons.map((lesson) => {
                    const isActive = lesson.id === currentLessonId;
                    const isCompleted = completedLessonIds.includes(lesson.id);

                    const rowClass = cn(
                      "flex items-center gap-3 px-5 py-2.5 ps-12 text-sm",
                      isActive && "bg-primary-soft text-primary font-medium",
                      canAccessLessons
                        ? "transition hover:bg-primary-soft/50"
                        : "cursor-not-allowed text-muted"
                    );

                    const content = (
                      <>
                        <PlayCircle
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isCompleted ? "text-success" : "text-primary"
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                        <span className="shrink-0 text-xs text-muted">
                          {formatDuration(lesson.durationMin)}
                        </span>
                      </>
                    );

                    return (
                      <li key={lesson.id}>
                        {canAccessLessons ? (
                          <Link
                            href={`/${locale}/courses/${courseId}/lessons/${lesson.id}`}
                            className={rowClass}
                          >
                            {content}
                          </Link>
                        ) : (
                          <div className={rowClass}>{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
