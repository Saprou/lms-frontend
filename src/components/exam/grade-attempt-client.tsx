"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { clientApi } from "@/lib/api-client";
import { GradeForm } from "@/components/exam/grade-form";

type DashboardAttempt = {
  id: string;
  status: string;
  examId: string;
  user: { id: string; name: string; email: string };
  exam: {
    id: string;
    title: string;
    courseId: string;
    questions: { id: string; points: number; type: string }[];
  };
  answers: {
    id: string;
    questionId: string;
    shortAnswer: string | null;
    pointsAwarded: number | null;
    feedback: string | null;
    question: {
      id: string;
      prompt: string;
      type: string;
      points: number;
    };
  }[];
};

export function GradeAttemptClient({ attemptId }: { attemptId: string }) {
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<DashboardAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clientApi<{ role: string; attemptsNeedingGrading: DashboardAttempt[] }>(
      "/api/dashboard"
    )
      .then((data) => {
        const found = data.attemptsNeedingGrading?.find((a) => a.id === attemptId);
        if (found) {
          setAttempt(found);
        } else {
          setError("Attempt not found or already graded");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load attempt");
      })
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return <div className="card p-12 text-center text-muted">{tc("loading")}</div>;
  }

  if (error || !attempt) {
    return <div className="card p-12 text-center text-muted">{error ?? tc("noResults")}</div>;
  }

  const maxScore = attempt.exam.questions.reduce((s, q) => s + q.points, 0);
  const mcqScore = attempt.answers
    .filter((a) => a.question.type === "MCQ")
    .reduce((s, a) => s + (a.pointsAwarded ?? 0), 0);

  const shortAnswers = attempt.answers
    .filter((a) => a.question.type === "SHORT_ANSWER")
    .map((a) => ({
      answerId: a.id,
      questionId: a.questionId,
      prompt: a.question.prompt,
      maxPoints: a.question.points,
      shortAnswer: a.shortAnswer,
      pointsAwarded: a.pointsAwarded,
      feedback: a.feedback,
    }));

  return (
    <GradeForm
      attemptId={attemptId}
      studentName={attempt.user.name}
      examTitle={attempt.exam.title}
      shortAnswers={shortAnswers}
      mcqScore={mcqScore}
      maxScore={maxScore}
      status={attempt.status}
    />
  );
}
