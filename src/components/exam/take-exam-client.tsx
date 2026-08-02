"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { clientApi } from "@/lib/api-client";
import { ExamCbt } from "@/components/exam/exam-cbt";

type ExamQuestion = {
  id: string;
  prompt: string;
  type: "MCQ" | "SHORT_ANSWER";
  points: number;
  order: number;
  options: { id: string; text: string }[];
};

type StartResponse = {
  attempt: {
    id: string;
    startedAt: string;
    answers?: {
      questionId: string;
      selectedOptionId: string | null;
      shortAnswer: string | null;
    }[];
  };
  questions: ExamQuestion[];
};

export function TakeExamClient({ examId }: { examId: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [examMeta, setExamMeta] = useState<{
    title: string;
    passage: string | null;
    durationMin: number;
  } | null>(null);
  const [startData, setStartData] = useState<StartResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const { exam, attempts } = await clientApi<{
          exam: {
            title: string;
            passage: string | null;
            durationMin: number;
          };
          attempts: { status: string }[];
        }>(`/api/exams/${examId}`);
        if (cancelled) return;

        const finished = attempts?.some((a) =>
          ["SUBMITTED", "RELEASED"].includes(a.status)
        );
        if (finished) {
          router.replace(`/${locale}/exams/${examId}`);
          return;
        }

        setExamMeta(exam);

        const data = await clientApi<StartResponse>(`/api/exams/${examId}/attempt`, {
          method: "POST",
        });
        if (cancelled) return;
        setStartData(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to start exam");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [examId, locale, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted">{t("loading")}</p>
      </div>
    );
  }

  if (error || !examMeta || !startData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-danger">{error ?? "Unable to start exam"}</p>
      </div>
    );
  }

  const initialAnswers: Record<
    string,
    { selectedOptionId?: string; shortAnswer?: string }
  > = {};
  for (const a of startData.attempt.answers ?? []) {
    initialAnswers[a.questionId] = {
      selectedOptionId: a.selectedOptionId ?? undefined,
      shortAnswer: a.shortAnswer ?? undefined,
    };
  }

  return (
    <ExamCbt
      examId={examId}
      attemptId={startData.attempt.id}
      title={examMeta.title}
      passage={examMeta.passage}
      durationMin={examMeta.durationMin}
      startedAt={startData.attempt.startedAt}
      questions={startData.questions}
      initialAnswers={initialAnswers}
    />
  );
}
