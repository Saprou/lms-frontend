"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { clientApi } from "@/lib/api-client";

type Level = { id: string; name: string; description?: string | null };
type Course = { id: string; title: string; levelId?: string | null };

type McqOption = { text: string; isCorrect: boolean };
type QuestionDraft = {
  id: string;
  prompt: string;
  type: "MCQ" | "SHORT_ANSWER";
  points: number;
  options: McqOption[];
};

export type ExamFormInitial = {
  id: string;
  title: string;
  description: string | null;
  passage: string | null;
  durationMin: number;
  opensAt: string | null;
  closesAt: string | null;
  levelId: string;
  courseId: string | null;
  attemptCount?: number;
  questions: {
    prompt: string;
    type: "MCQ" | "SHORT_ANSWER";
    points: number;
    options: { text: string; isCorrect: boolean }[];
  }[];
};

let uidCounter = 0;
function uid() {
  uidCounter += 1;
  return `q-${uidCounter}`;
}

function emptyMcqOptions(): McqOption[] {
  return [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ];
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function questionsFromInitial(initial?: ExamFormInitial): QuestionDraft[] {
  if (!initial?.questions?.length) {
    return [
      {
        id: "q-1",
        prompt: "",
        type: "MCQ",
        points: 1,
        options: emptyMcqOptions(),
      },
    ];
  }
  return initial.questions.map((q) => ({
    id: uid(),
    prompt: q.prompt,
    type: q.type,
    points: q.points,
    options:
      q.type === "MCQ"
        ? q.options.length >= 2
          ? q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect }))
          : emptyMcqOptions()
        : [],
  }));
}

export function NewExamForm({
  levels,
  courses,
  initialExam,
}: {
  levels: Level[];
  courses: Course[];
  initialExam?: ExamFormInitial;
}) {
  const t = useTranslations("exam");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const isEdit = Boolean(initialExam);

  const [loading, setLoading] = useState(false);
  const [levelId, setLevelId] = useState(
    initialExam?.levelId ?? levels[0]?.id ?? ""
  );
  const [courseId, setCourseId] = useState(initialExam?.courseId ?? "");
  const [title, setTitle] = useState(initialExam?.title ?? "");
  const [description, setDescription] = useState(
    initialExam?.description ?? ""
  );
  const [passage, setPassage] = useState(initialExam?.passage ?? "");
  const [durationMin, setDurationMin] = useState(
    initialExam?.durationMin ?? 60
  );
  const [opensAt, setOpensAt] = useState(toLocalInput(initialExam?.opensAt ?? null));
  const [closesAt, setClosesAt] = useState(
    toLocalInput(initialExam?.closesAt ?? null)
  );
  const [questions, setQuestions] = useState<QuestionDraft[]>(() =>
    questionsFromInitial(initialExam)
  );

  const hasAttempts = (initialExam?.attemptCount ?? 0) > 0;
  const lockQuestions = isEdit && hasAttempts;

  const coursesForLevel = useMemo(
    () =>
      courses.filter(
        (c) => !levelId || !c.levelId || c.levelId === levelId
      ),
    [courses, levelId]
  );

  function addQuestion(type: "MCQ" | "SHORT_ANSWER") {
    if (lockQuestions) return;
    setQuestions((prev) => [
      ...prev,
      {
        id: uid(),
        prompt: "",
        type,
        points: 1,
        options: type === "MCQ" ? emptyMcqOptions() : [],
      },
    ]);
  }

  function removeQuestion(id: string) {
    if (lockQuestions) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, patch: Partial<QuestionDraft>) {
    if (lockQuestions) return;
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  }

  function updateOption(qId: string, idx: number, patch: Partial<McqOption>) {
    if (lockQuestions) return;
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        if (patch.isCorrect) {
          return {
            ...q,
            options: q.options.map((o, i) => ({
              ...o,
              isCorrect: i === idx,
              ...(i === idx ? patch : {}),
            })),
          };
        }
        const options = q.options.map((o, i) =>
          i === idx ? { ...o, ...patch } : o
        );
        return { ...q, options };
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!levelId) {
      toast.error(t("levelRequired"));
      return;
    }
    if (!title.trim()) {
      toast.error(t("titleRequired"));
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        levelId,
        courseId: courseId || null,
        title: title.trim(),
        description: description.trim() || undefined,
        passage: passage.trim() || undefined,
        durationMin,
        opensAt: opensAt ? new Date(opensAt).toISOString() : undefined,
        closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
      };

      if (!lockQuestions) {
        payload.questions = questions.map((q) => ({
          prompt: q.prompt,
          type: q.type,
          points: q.points,
          options: q.type === "MCQ" ? q.options : undefined,
        }));
      }

      if (isEdit && initialExam) {
        await clientApi<{ exam: { id: string } }>(
          `/api/exams/${initialExam.id}`,
          { method: "PATCH", json: payload }
        );
        toast.success(t("updated"));
        router.push(`/${locale}/exams/${initialExam.id}`);
      } else {
        const data = await clientApi<{ exam: { id: string } }>("/api/exams", {
          method: "POST",
          json: payload,
        });
        toast.success(t("create"));
        router.push(`/${locale}/exams/${data.exam.id}`);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  if (levels.length === 0) {
    return (
      <div className="card p-8 text-center text-muted">{t("noLevels")}</div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <div className="card space-y-4 p-6">
        <div>
          <label className="label" htmlFor="exam-level">
            {t("level")}
          </label>
          <select
            id="exam-level"
            className="input"
            value={levelId}
            onChange={(e) => {
              setLevelId(e.target.value);
              setCourseId("");
            }}
            required
          >
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="exam-course">
            {t("courseOptional")}
          </label>
          <select
            id="exam-course"
            className="input"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">{t("noCourse")}</option>
            {coursesForLevel.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">{t("courseOptionalHint")}</p>
        </div>
        <div>
          <label className="label">{t("examTitle")}</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder={t("examTitle")}
          />
        </div>
        <div>
          <label className="label">{t("description")}</label>
          <textarea
            className="input min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t("passage")}</label>
          <textarea
            className="input min-h-[120px] font-mono text-sm"
            value={passage}
            onChange={(e) => setPassage(e.target.value)}
            placeholder="Clinical vignette or reading passage..."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">{t("durationLabel")}</label>
            <input
              type="number"
              min={1}
              className="input"
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="label">{t("startsAt")}</label>
            <input
              type="datetime-local"
              className="input"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t("endsAt")}</label>
            <input
              type="datetime-local"
              className="input"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t("questions")}</h2>
          {!lockQuestions && (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => addQuestion("MCQ")}
              >
                <Plus className="h-3.5 w-3.5" />
                MCQ
              </button>
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => addQuestion("SHORT_ANSWER")}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("shortAnswer")}
              </button>
            </div>
          )}
        </div>

        {lockQuestions && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("questionsLocked")}
          </p>
        )}

        {questions.map((q, qi) => (
          <div key={q.id} className="card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted">Q{qi + 1}</span>
              {!lockQuestions && questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="rounded-lg p-1.5 text-danger hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <textarea
              className="input min-h-[70px]"
              placeholder={t("questionPrompt")}
              value={q.prompt}
              onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
              required
              readOnly={lockQuestions}
              disabled={lockQuestions}
            />
            <div className="flex gap-3">
              <select
                className="input max-w-[180px]"
                value={q.type}
                disabled={lockQuestions}
                onChange={(e) =>
                  updateQuestion(q.id, {
                    type: e.target.value as "MCQ" | "SHORT_ANSWER",
                    options: e.target.value === "MCQ" ? emptyMcqOptions() : [],
                  })
                }
              >
                <option value="MCQ">{t("multipleChoice")}</option>
                <option value="SHORT_ANSWER">{t("shortAnswer")}</option>
              </select>
              <input
                type="number"
                min={1}
                className="input max-w-[100px]"
                value={q.points}
                disabled={lockQuestions}
                onChange={(e) =>
                  updateQuestion(q.id, { points: Number(e.target.value) })
                }
              />
              <span className="self-center text-sm text-muted">pts</span>
            </div>

            {q.type === "MCQ" && (
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={opt.isCorrect}
                      disabled={lockQuestions}
                      onChange={() =>
                        updateOption(q.id, oi, { isCorrect: true })
                      }
                    />
                    <input
                      className="input"
                      placeholder={`${t("option")} ${oi + 1}`}
                      value={opt.text}
                      disabled={lockQuestions}
                      onChange={(e) =>
                        updateOption(q.id, oi, { text: e.target.value })
                      }
                      required
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !levelId}
        >
          {loading ? tc("loading") : isEdit ? tc("save") : tc("create")}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
        >
          {tc("cancel")}
        </button>
      </div>
    </form>
  );
}
