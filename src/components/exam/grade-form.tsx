"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { clientApi } from "@/lib/api-client";

type ShortAnswer = {
  answerId: string;
  questionId: string;
  prompt: string;
  maxPoints: number;
  shortAnswer: string | null;
  pointsAwarded: number | null;
  feedback: string | null;
};

type GradeFormProps = {
  attemptId: string;
  studentName: string;
  examTitle: string;
  shortAnswers: ShortAnswer[];
  mcqScore: number;
  maxScore: number;
  status: string;
};

export function GradeForm({
  attemptId,
  studentName,
  examTitle,
  shortAnswers,
  mcqScore,
  maxScore,
  status,
}: GradeFormProps) {
  const t = useTranslations("exam");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [grades, setGrades] = useState(
    shortAnswers.map((a) => ({
      answerId: a.answerId,
      pointsAwarded: a.pointsAwarded ?? 0,
      feedback: a.feedback ?? "",
    }))
  );
  const [loading, setLoading] = useState(false);

  function updateGrade(
    answerId: string,
    patch: { pointsAwarded?: number; feedback?: string }
  ) {
    setGrades((prev) =>
      prev.map((g) => (g.answerId === answerId ? { ...g, ...patch } : g))
    );
  }

  async function saveGrades(release: boolean) {
    setLoading(true);
    try {
      await clientApi(`/api/exams/attempts/${attemptId}/grade`, {
        method: "PATCH",
        json: { answers: grades, release },
      });
      toast.success(release ? t("released") : tc("save"));
      if (release) router.push(`/${locale}/exams`);
      else router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const shortTotal = grades.reduce((s, g) => s + g.pointsAwarded, 0);
  const projectedTotal = mcqScore + shortTotal;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <p className="text-sm text-muted">{examTitle}</p>
        <h2 className="text-xl font-bold">{studentName}</h2>
        <p className="mt-2 text-sm">
          MCQ auto-score: {mcqScore} / {maxScore} (projected total: {projectedTotal})
        </p>
        {status === "RELEASED" && (
          <span className="mt-2 inline-block rounded-lg bg-green-50 px-3 py-1 text-sm font-medium text-success">
            {t("released")}
          </span>
        )}
      </div>

      {shortAnswers.length === 0 ? (
        <div className="card p-6 text-center text-muted">
          No short-answer questions to grade.
          {status !== "RELEASED" && (
            <button
              type="button"
              className="btn btn-primary mt-4"
              disabled={loading}
              onClick={() => saveGrades(true)}
            >
              {t("release")}
            </button>
          )}
        </div>
      ) : (
        shortAnswers.map((sa, i) => {
          const grade = grades.find((g) => g.answerId === sa.answerId)!;
          return (
            <div key={sa.answerId} className="card p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted">Q{i + 1}</span>
                <span className="text-xs text-muted">
                  {t("points", { points: sa.maxPoints })}
                </span>
              </div>
              <p className="font-medium">{sa.prompt}</p>
              <div className="rounded-lg bg-gray-50 p-4 text-sm">
                {sa.shortAnswer || "(No answer provided)"}
              </div>
              <div>
                <label className="label">{t("awardPoints")}</label>
                <input
                  type="number"
                  min={0}
                  max={sa.maxPoints}
                  className="input max-w-[120px]"
                  value={grade.pointsAwarded}
                  onChange={(e) =>
                    updateGrade(sa.answerId, {
                      pointsAwarded: Number(e.target.value),
                    })
                  }
                  disabled={status === "RELEASED"}
                />
              </div>
              <div>
                <label className="label">{t("feedback")}</label>
                <textarea
                  className="input min-h-[80px]"
                  value={grade.feedback}
                  onChange={(e) =>
                    updateGrade(sa.answerId, { feedback: e.target.value })
                  }
                  disabled={status === "RELEASED"}
                />
              </div>
            </div>
          );
        })
      )}

      {status !== "RELEASED" && (
        <div className="flex gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => saveGrades(false)}
          >
            {tc("save")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={() => saveGrades(true)}
          >
            {t("release")}
          </button>
        </div>
      )}
    </div>
  );
}
