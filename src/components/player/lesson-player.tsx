"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  StickyNote,
  ClipboardList,
} from "lucide-react";
import toast from "react-hot-toast";
import { clientApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { SecureVideoPlayer } from "./secure-video-player";

type Block = {
  id: string;
  type: "VIDEO" | "IMAGE" | "TEXT";
  content: string;
  mediaUrl: string | null;
  hasSecureVideo?: boolean;
  order: number;
};

type Quiz = {
  id: string;
  title: string;
};

type LessonItem = {
  id: string;
  title: string;
  durationMin: number;
  progress?: { completed: boolean }[];
};

type Module = {
  id: string;
  title: string;
  order: number;
  lessons: LessonItem[];
};

type Props = {
  courseId: string;
  courseTitle: string;
  lesson: {
    id: string;
    title: string;
    blocks: Block[];
    quizzes: Quiz[];
  };
  modules: Module[];
  watchPosition: number;
  completed: boolean;
};

type Tab = "overview" | "quiz" | "notes";

export function LessonPlayer({
  courseId,
  courseTitle,
  lesson,
  modules,
  watchPosition: initialWatchPosition,
  completed: initialCompleted,
}: Props) {
  const t = useTranslations("player");
  const tc = useTranslations("common");
  const locale = useLocale();
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPosition = useRef(initialWatchPosition);

  const [tab, setTab] = useState<Tab>("overview");
  const [completed, setCompleted] = useState(initialCompleted);
  const [note, setNote] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>([]);

  const videoBlock = lesson.blocks.find(
    (b) => b.type === "VIDEO" && (b.hasSecureVideo || b.mediaUrl)
  );

  const saveProgress = useCallback(
    async (position: number, markComplete?: boolean) => {
      try {
        await clientApi("/api/progress", {
          method: "POST",
          json: {
            lessonId: lesson.id,
            watchPosition: position,
            ...(markComplete !== undefined && { completed: markComplete }),
          },
        });
      } catch {
        /* silent */
      }
    },
    [lesson.id]
  );

  function handleTimeUpdate(currentTime: number) {
    lastPosition.current = currentTime;
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => {
      saveProgress(currentTime);
    }, 3000);
  }

  async function handleMarkComplete() {
    await saveProgress(lastPosition.current, true);
    setCompleted(true);
    toast.success(t("completed"));
  }

  function handleSaveNote() {
    if (!note.trim()) return;
    setSavedNotes((prev) => [...prev, note.trim()]);
    setNote("");
    toast.success(t("saveNote"));
  }

  const completedIds = modules.flatMap((m) =>
    m.lessons.filter((l) => l.progress?.[0]?.completed).map((l) => l.id)
  );

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: t("overview"), icon: null },
    ...(lesson.quizzes.length > 0
      ? [{ key: "quiz" as Tab, label: t("quiz"), icon: <ClipboardList className="h-4 w-4" /> }]
      : []),
    { key: "notes", label: t("notes"), icon: <StickyNote className="h-4 w-4" /> },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted">
          <Link href={`/${locale}/courses`} className="hover:text-primary">
            Courses
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/${locale}/courses/${courseId}`}
            className="hover:text-primary"
          >
            {courseTitle}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{lesson.title}</span>
        </nav>

        <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>

        <div className="overflow-hidden rounded-2xl bg-black">
          {videoBlock?.hasSecureVideo ? (
            <SecureVideoPlayer
              lessonId={lesson.id}
              blockId={videoBlock.id}
              initialWatchPosition={initialWatchPosition}
              onTimeUpdate={handleTimeUpdate}
            />
          ) : videoBlock?.mediaUrl ? (
            // Instructor-only legacy/demo preview — students never receive mediaUrl for VIDEO
            <video
              src={videoBlock.mediaUrl}
              controls
              controlsList="nodownload"
              className="aspect-video w-full"
              onContextMenu={(e) => e.preventDefault()}
              onTimeUpdate={(e) =>
                handleTimeUpdate((e.target as HTMLVideoElement).currentTime)
              }
            />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-primary-soft text-muted">
              No video for this lesson
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-secondary" onClick={handleSaveNote}>
            <StickyNote className="h-4 w-4" />
            {t("saveNote")}
          </button>
          {!completed ? (
            <button type="button" className="btn btn-primary" onClick={handleMarkComplete}>
              <CheckCircle2 className="h-4 w-4" />
              {t("markComplete")}
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" />
              {t("completed")}
            </span>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex border-b border-border">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-medium transition",
                  tab === item.key
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted hover:text-foreground"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === "overview" && (
              <div className="space-y-4">
                {lesson.blocks.map((block) => {
                  if (block.type === "TEXT") {
                    return (
                      <p
                        key={block.id}
                        className="whitespace-pre-wrap text-sm leading-relaxed text-muted"
                      >
                        {block.content}
                      </p>
                    );
                  }
                  if (block.type === "IMAGE" && block.mediaUrl) {
                    return (
                      <div key={block.id} className="relative aspect-video overflow-hidden rounded-xl">
                        <Image
                          src={block.mediaUrl}
                          alt={block.content || "Lesson image"}
                          fill
                          className="object-contain"
                          unoptimized={block.mediaUrl.startsWith("/uploads")}
                        />
                      </div>
                    );
                  }
                  if (
                    block.type === "VIDEO" &&
                    (block.hasSecureVideo || block.mediaUrl) &&
                    block.id !== videoBlock?.id
                  ) {
                    return (
                      <SecureVideoPlayer
                        key={block.id}
                        lessonId={lesson.id}
                        blockId={block.id}
                        className="rounded-xl"
                      />
                    );
                  }
                  return null;
                })}
              </div>
            )}

            {tab === "quiz" && (
              <div className="space-y-3">
                {lesson.quizzes.length === 0 ? (
                  <p className="text-sm text-muted">{tc("noResults")}</p>
                ) : (
                  lesson.quizzes.map((quiz) => (
                    <Link
                      key={quiz.id}
                      href={`/${locale}/courses/${courseId}/lessons/${lesson.id}/quiz/${quiz.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border p-4 transition hover:bg-primary-soft/50"
                    >
                      <ClipboardList className="h-5 w-5 text-primary" />
                      <span className="font-medium">{quiz.title}</span>
                    </Link>
                  ))
                )}
              </div>
            )}

            {tab === "notes" && (
              <div className="space-y-4">
                <textarea
                  className="input min-h-[100px]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("saveNote")}
                />
                <button type="button" className="btn btn-primary" onClick={handleSaveNote}>
                  {t("saveNote")}
                </button>
                {savedNotes.length > 0 && (
                  <ul className="space-y-2 border-t border-border pt-4">
                    {savedNotes.map((n, i) => (
                      <li key={i} className="rounded-lg bg-gray-50 p-3 text-sm">
                        {n}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-bold">{t("myProgress")}</h3>
            <p className="text-sm text-muted">{courseTitle}</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-border">
            {modules.map((mod) => (
              <div key={mod.id}>
                <p className="bg-gray-50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {mod.title}
                </p>
                <ul>
                  {mod.lessons.map((l) => {
                    const isActive = l.id === lesson.id;
                    const isDone =
                      completedIds.includes(l.id) || (isActive && completed);

                    return (
                      <li key={l.id}>
                        <Link
                          href={`/${locale}/courses/${courseId}/lessons/${l.id}`}
                          className={cn(
                            "flex items-center gap-3 px-5 py-2.5 text-sm transition hover:bg-primary-soft/50",
                            isActive && "bg-primary-soft font-medium text-primary"
                          )}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted" />
                          )}
                          <span className="min-w-0 flex-1 truncate">{l.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
