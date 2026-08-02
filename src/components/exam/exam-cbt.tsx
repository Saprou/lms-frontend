"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { clientApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type ExamOption = { id: string; text: string };
type ExamQuestion = {
  id: string;
  prompt: string;
  type: "MCQ" | "SHORT_ANSWER";
  points: number;
  order: number;
  options: ExamOption[];
};

type ExamCbtProps = {
  examId: string;
  attemptId: string;
  title: string;
  passage: string | null;
  durationMin: number;
  startedAt: string;
  questions: ExamQuestion[];
  initialAnswers?: Record<
    string,
    { selectedOptionId?: string; shortAnswer?: string }
  >;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function PassagePane({ passage }: { passage: string | null }) {
  const t = useTranslations("exam");
  const lines = (passage || "No passage for this exam.").split("\n");

  return (
    <div className="flex h-full flex-col border-e border-border bg-white">
      <div className="border-b border-border bg-exam-blue-soft px-4 py-2.5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-exam-blue">
          {t("passage")}
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-3">
            <span className="w-8 shrink-0 select-none text-right text-muted">
              {i + 1}
            </span>
            <span className="flex-1">{line || "\u00A0"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExamCbt({
  examId,
  attemptId,
  title,
  passage,
  durationMin,
  startedAt,
  questions,
  initialAnswers = {},
}: ExamCbtProps) {
  const t = useTranslations("exam");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const sorted = [...questions].sort((a, b) => a.order - b.order);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] =
    useState<Record<string, { selectedOptionId?: string; shortAnswer?: string }>>(
      initialAnswers
    );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);

  const startMs = new Date(startedAt).getTime();
  const endMs = startMs + durationMin * 60 * 1000;
  // Stable initial value for SSR/hydration; real countdown starts in useEffect
  const [secondsLeft, setSecondsLeft] = useState(durationMin * 60);

  const current = sorted[currentIdx];

  const saveAnswers = useCallback(
    async (payload: typeof answers) => {
      const arr = Object.entries(payload).map(([questionId, a]) => ({
        questionId,
        selectedOptionId: a.selectedOptionId,
        shortAnswer: a.shortAnswer,
      }));
      if (arr.length === 0) return;
      await clientApi(`/api/exams/${examId}/attempt`, {
        method: "PATCH",
        json: { answers: arr },
      });
    },
    [examId]
  );

  const submitExam = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await saveAnswers(answers);
      await clientApi(`/api/exams/${examId}/attempt`, { method: "PUT" });
      setSubmitted(true);
      toast.success(t("submitted"));
      router.push(`/${locale}/exams/${examId}`);
    } catch (e) {
      submittedRef.current = false;
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }, [answers, examId, locale, router, saveAnswers, t]);

  useEffect(() => {
    const sync = () => {
      const left = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
      setSecondsLeft(left);
      return left;
    };
    if (sync() === 0 && !submittedRef.current) {
      submitExam();
      return;
    }
    const tick = setInterval(() => {
      if (sync() === 0 && !submittedRef.current) {
        clearInterval(tick);
        submitExam();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [endMs, submitExam]);

  function setAnswer(
    questionId: string,
    update: { selectedOptionId?: string; shortAnswer?: string }
  ) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...update },
    }));
  }

  async function handleProceed() {
    await saveAnswers(answers);
    if (currentIdx < sorted.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      if (window.confirm(t("submitExam") + "?")) {
        await submitExam();
      }
    }
  }

  function handleExit() {
    if (window.confirm(tc("exit") + "?")) {
      router.push(`/${locale}/exams/${examId}`);
    }
  }

  const urgent = secondsLeft <= 300;

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="card p-8 text-center">
          <p className="text-lg font-semibold">{t("submitted")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-white px-4 py-3 md:px-6">
        <h1 className="truncate text-base font-bold md:text-lg">{title}</h1>
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "rounded-lg px-3 py-1.5 font-mono text-sm font-bold",
              urgent
                ? "bg-red-50 text-danger"
                : "bg-exam-blue-soft text-exam-blue"
            )}
          >
            {t("timer")}: {formatTime(secondsLeft)}
          </div>
          <button type="button" onClick={handleExit} className="btn btn-secondary !py-2">
            <LogOut className="h-4 w-4" />
            {tc("exit")}
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-2">
        <PassagePane passage={passage} />

        <div className="flex h-full flex-col bg-white">
          <div className="border-b border-border px-4 py-3 md:px-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-exam-blue">
                {t("questionOf", { current: currentIdx + 1, total: sorted.length })}
              </span>
              <span className="text-xs text-muted">
                {t("points", { points: current.points })}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
            <p className="mb-5 text-base font-medium leading-relaxed">
              {current.prompt}
            </p>

            {current.type === "MCQ" ? (
              <div className="space-y-3">
                {current.options.map((opt) => {
                  const selected = answers[current.id]?.selectedOptionId === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-lg border-2 px-4 py-3 transition",
                        selected
                          ? "border-exam-blue bg-exam-blue-soft"
                          : "border-border hover:border-exam-blue/40"
                      )}
                    >
                      <input
                        type="radio"
                        name={current.id}
                        checked={selected}
                        onChange={() =>
                          setAnswer(current.id, { selectedOptionId: opt.id })
                        }
                        className="mt-0.5 accent-[var(--exam-blue)]"
                      />
                      <span className="text-sm">{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div>
                <label className="label">{t("shortAnswer")}</label>
                <textarea
                  className="input min-h-[160px] resize-y"
                  value={answers[current.id]?.shortAnswer ?? ""}
                  onChange={(e) =>
                    setAnswer(current.id, { shortAnswer: e.target.value })
                  }
                  placeholder={t("shortAnswer")}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-4 md:px-6">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => i - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              {tc("previous")}
            </button>

            <button
              type="button"
              className="btn btn-exam"
              disabled={submitting}
              onClick={handleProceed}
            >
              {currentIdx < sorted.length - 1 ? tc("proceed") : t("submitExam")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
