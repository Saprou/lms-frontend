"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { clientApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type QuizOption = { id: string; text: string };
type QuizQuestion = { id: string; prompt: string; order: number; options: QuizOption[] };
type QuizData = { id: string; title: string; questions: QuizQuestion[] };

export function QuizTaker({ quiz }: { quiz: QuizData }) {
  const t = useTranslations("quiz");
  const tc = useTranslations("common");

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number } | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  const questions = [...quiz.questions].sort((a, b) => a.order - b.order);
  const current = questions[currentIdx];
  const allAnswered = questions.every((q) => answers[q.id]);

  async function handleSubmit() {
    if (!allAnswered) {
      toast.error(t("chooseOne"));
      return;
    }
    setSubmitting(true);
    try {
      const data = await clientApi<{ score: number; maxScore: number }>(
        `/api/quizzes/${quiz.id}/submit`,
        { method: "POST", json: { answers } }
      );
      setResult({ score: data.score, maxScore: data.maxScore });
      toast.success(t("score", { score: data.score, max: data.maxScore }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetry() {
    setAnswers({});
    setResult(null);
    setCurrentIdx(0);
  }

  if (result) {
    const pct = Math.round((result.score / result.maxScore) * 100);
    const passed = pct >= 70;
    return (
      <div className="mx-auto w-full max-w-xl">
        <div className="card p-8 text-center">
          <div
            className={cn(
              "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
              passed ? "bg-green-50 text-success" : "bg-red-50 text-danger"
            )}
          >
            {passed ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <XCircle className="h-8 w-8" />
            )}
          </div>
          <h2 className="text-2xl font-bold">{quiz.title}</h2>
          <p className="mt-2 text-lg text-muted">
            {t("score", { score: result.score, max: result.maxScore })}
          </p>
          <p className="mt-1 text-3xl font-bold text-primary">{pct}%</p>
          <button type="button" onClick={handleRetry} className="btn btn-secondary mt-6">
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="card p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">{quiz.title}</h2>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            {t("questionOf", { current: currentIdx + 1, total: questions.length })}
          </span>
        </div>

        <p className="mb-2 text-sm font-medium text-muted">{t("chooseOne")}</p>
        <p className="mb-5 text-base font-semibold leading-relaxed">{current.prompt}</p>

        <div className="space-y-3">
          {current.options.map((opt) => {
            const selected = answers[current.id] === opt.id;
            return (
              <label
                key={opt.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition",
                  selected
                    ? "border-primary-border bg-primary-soft"
                    : "border-border bg-white hover:border-primary-border/50"
                )}
              >
                <input
                  type="radio"
                  name={current.id}
                  value={opt.id}
                  checked={selected}
                  onChange={() =>
                    setAnswers((prev) => ({ ...prev, [current.id]: opt.id }))
                  }
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">{opt.text}</span>
              </label>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => i - 1)}
          >
            {tc("previous")}
          </button>

          {currentIdx < questions.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!answers[current.id]}
              onClick={() => setCurrentIdx((i) => i + 1)}
            >
              {tc("next")}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!allAnswered || submitting}
              onClick={handleSubmit}
            >
              {submitting ? tc("loading") : t("submit")}
            </button>
          )}
        </div>

        <div className="mt-6 flex justify-center gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIdx(i)}
              className={cn(
                "h-2 w-2 rounded-full transition",
                i === currentIdx
                  ? "w-6 bg-primary"
                  : answers[q.id]
                    ? "bg-primary-border"
                    : "bg-border"
              )}
              aria-label={`Question ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
