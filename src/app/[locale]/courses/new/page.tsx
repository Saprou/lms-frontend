"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2, Upload, ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";
import { clientApi } from "@/lib/api-client";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";

type BlockType = "VIDEO" | "IMAGE" | "TEXT";

type BlockDraft = {
  type: BlockType;
  content: string;
  mediaUrl: string | null;
  file: File | null;
};

type LessonDraft = {
  id: string;
  title: string;
  durationMin: number;
  blocks: BlockDraft[];
};

type ModuleDraft = {
  id: string;
  title: string;
  lessons: LessonDraft[];
};

let uidCounter = 0;
function uid() {
  uidCounter += 1;
  return `draft-${uidCounter}`;
}

async function uploadFile(file: File, folder: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const data = await clientApi<{ url: string }>("/api/upload", {
    method: "POST",
    formData: form,
  });
  return data.url;
}

export default function NewCoursePage() {
  const t = useTranslations("wizard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [modules, setModules] = useState<ModuleDraft[]>([
    { id: "module-1", title: "", lessons: [] },
  ]);

  const steps = [
    { num: 1, label: t("stepBasics") },
    { num: 2, label: t("stepModules") },
    { num: 3, label: t("stepLessons") },
  ];

  function addModule() {
    setModules((prev) => [...prev, { id: uid(), title: "", lessons: [] }]);
  }

  function removeModule(id: string) {
    setModules((prev) => prev.filter((m) => m.id !== id));
  }

  function updateModuleTitle(id: string, value: string) {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, title: value } : m))
    );
  }

  function addLesson(moduleId: string) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: [
                ...m.lessons,
                {
                  id: uid(),
                  title: "",
                  durationMin: 5,
                  blocks: [{ type: "TEXT", content: "", mediaUrl: null, file: null }],
                },
              ],
            }
          : m
      )
    );
  }

  function removeLesson(moduleId: string, lessonId: string) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
          : m
      )
    );
  }

  function updateLesson(
    moduleId: string,
    lessonId: string,
    patch: Partial<LessonDraft>
  ) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === lessonId ? { ...l, ...patch } : l
              ),
            }
          : m
      )
    );
  }

  function addBlock(moduleId: string, lessonId: string, type: BlockType) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === lessonId
                  ? {
                      ...l,
                      blocks: [
                        ...l.blocks,
                        { type, content: "", mediaUrl: null, file: null },
                      ],
                    }
                  : l
              ),
            }
          : m
      )
    );
  }

  function updateBlock(
    moduleId: string,
    lessonId: string,
    blockIndex: number,
    patch: Partial<BlockDraft>
  ) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === lessonId
                  ? {
                      ...l,
                      blocks: l.blocks.map((b, i) =>
                        i === blockIndex ? { ...b, ...patch } : b
                      ),
                    }
                  : l
              ),
            }
          : m
      )
    );
  }

  function removeBlock(moduleId: string, lessonId: string, blockIndex: number) {
    setModules((prev) =>
      prev.map((m) =>
        m.id === moduleId
          ? {
              ...m,
              lessons: m.lessons.map((l) =>
                l.id === lessonId
                  ? { ...l, blocks: l.blocks.filter((_, i) => i !== blockIndex) }
                  : l
              ),
            }
          : m
      )
    );
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverUrl(URL.createObjectURL(file));
  }

  async function handlePublish() {
    if (!title.trim() || description.trim().length < 10) {
      toast.error("Title and description (min 10 chars) are required");
      return;
    }

    setLoading(true);
    try {
      let finalCoverUrl = coverUrl;
      if (coverFile) {
        finalCoverUrl = await uploadFile(coverFile, "covers");
      }

      const courseData = await clientApi<{ course: { id: string } }>("/api/courses", {
        method: "POST",
        json: {
          title,
          description,
          coverUrl: finalCoverUrl,
          published: false,
        },
      });
      const courseId = courseData.course.id;

      for (let mi = 0; mi < modules.length; mi++) {
        const mod = modules[mi];
        if (!mod.title.trim()) continue;

        const modData = await clientApi<{ module: { id: string } }>(
          `/api/courses/${courseId}/modules`,
          {
            method: "POST",
            json: { title: mod.title, order: mi },
          }
        );
        const moduleId = modData.module.id;

        for (let li = 0; li < mod.lessons.length; li++) {
          const lesson = mod.lessons[li];
          if (!lesson.title.trim()) continue;

          const blocks = [];
          for (let bi = 0; bi < lesson.blocks.length; bi++) {
            const block = lesson.blocks[bi];
            let mediaUrl = block.mediaUrl;
            if (block.file) {
              const folder = block.type === "VIDEO" ? "videos" : "images";
              mediaUrl = await uploadFile(block.file, folder);
            }
            blocks.push({
              type: block.type,
              content: block.content,
              mediaUrl,
              order: bi,
            });
          }

          await clientApi(`/api/modules/${moduleId}/lessons`, {
            method: "POST",
            json: {
              title: lesson.title,
              order: li,
              durationMin: lesson.durationMin,
              blocks,
            },
          });
        }
      }

      await clientApi(`/api/courses/${courseId}`, {
        method: "PATCH",
        json: { published: true },
      });

      toast.success(tc("publish"));
      router.push(`/${locale}/courses/${courseId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title={t("title")}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-2">
          {steps.map((s) => (
            <div key={s.num} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                  step >= s.num
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-muted"
                )}
              >
                {s.num}
              </div>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  step >= s.num ? "text-foreground" : "text-muted"
                )}
              >
                {s.label}
              </span>
              {s.num < 3 && <div className="mx-2 h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="card space-y-5 p-6">
            <div>
              <label className="label">{t("courseTitle")}</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("courseTitle")}
              />
            </div>
            <div>
              <label className="label">{t("courseDescription")}</label>
              <textarea
                className="input min-h-[120px] resize-y"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("courseDescription")}
              />
            </div>
            <div>
              <label className="label">{t("coverImage")}</label>
              <div className="flex items-center gap-4">
                {coverUrl && (
                  <img
                    src={coverUrl}
                    alt=""
                    className="h-24 w-40 rounded-xl object-cover"
                  />
                )}
                <label className="btn btn-secondary cursor-pointer">
                  <Upload className="h-4 w-4" />
                  {t("uploadCover")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverChange}
                  />
                </label>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(2)}
              >
                {tc("next")}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {modules.map((mod, index) => (
              <div key={mod.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-2 text-sm font-bold text-muted">
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    <label className="label">{t("moduleTitle")}</label>
                    <input
                      className="input"
                      value={mod.title}
                      onChange={(e) => updateModuleTitle(mod.id, e.target.value)}
                    />
                  </div>
                  {modules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeModule(mod.id)}
                      className="mt-7 rounded-lg p-2 text-danger hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addModule}>
              <Plus className="h-4 w-4" />
              {t("addModule")}
            </button>
            <div className="flex justify-between pt-4">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4" />
                {tc("previous")}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                {tc("next")}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            {modules.map((mod, mi) => (
              <div key={mod.id} className="card p-5">
                <h3 className="font-bold">
                  {mi + 1}. {mod.title || t("moduleTitle")}
                </h3>
                <div className="mt-4 space-y-4">
                  {mod.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="rounded-xl border border-border bg-gray-50/50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="label">{t("lessonTitle")}</label>
                            <input
                              className="input"
                              value={lesson.title}
                              onChange={(e) =>
                                updateLesson(mod.id, lesson.id, { title: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <label className="label">Duration (min)</label>
                            <input
                              type="number"
                              min={0}
                              className="input w-32"
                              value={lesson.durationMin}
                              onChange={(e) =>
                                updateLesson(mod.id, lesson.id, {
                                  durationMin: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-semibold">{t("addBlock")}</p>
                            {lesson.blocks.map((block, bi) => (
                              <div
                                key={bi}
                                className="rounded-lg border border-border bg-white p-3"
                              >
                                <div className="mb-2 flex items-center justify-between">
                                  <select
                                    className="input w-auto text-sm"
                                    value={block.type}
                                    onChange={(e) =>
                                      updateBlock(mod.id, lesson.id, bi, {
                                        type: e.target.value as BlockType,
                                      })
                                    }
                                  >
                                    <option value="TEXT">{t("blockText")}</option>
                                    <option value="VIDEO">{t("blockVideo")}</option>
                                    <option value="IMAGE">{t("blockImage")}</option>
                                  </select>
                                  {lesson.blocks.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeBlock(mod.id, lesson.id, bi)}
                                      className="text-danger"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                                {block.type === "TEXT" ? (
                                  <textarea
                                    className="input min-h-[80px] text-sm"
                                    value={block.content}
                                    onChange={(e) =>
                                      updateBlock(mod.id, lesson.id, bi, {
                                        content: e.target.value,
                                      })
                                    }
                                    placeholder={t("blockText")}
                                  />
                                ) : (
                                  <div className="space-y-2">
                                    <input
                                      className="input text-sm"
                                      value={block.content}
                                      onChange={(e) =>
                                        updateBlock(mod.id, lesson.id, bi, {
                                          content: e.target.value,
                                        })
                                      }
                                      placeholder="Caption / alt text"
                                    />
                                    <label className="btn btn-secondary cursor-pointer text-sm">
                                      <Upload className="h-3.5 w-3.5" />
                                      Upload {block.type === "VIDEO" ? "video" : "image"}
                                      <input
                                        type="file"
                                        accept={
                                          block.type === "VIDEO" ? "video/*" : "image/*"
                                        }
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0] || null;
                                          updateBlock(mod.id, lesson.id, bi, { file });
                                        }}
                                      />
                                    </label>
                                    {block.file && (
                                      <p className="text-xs text-muted">{block.file.name}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn btn-secondary text-xs"
                                onClick={() => addBlock(mod.id, lesson.id, "TEXT")}
                              >
                                + {t("blockText")}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary text-xs"
                                onClick={() => addBlock(mod.id, lesson.id, "VIDEO")}
                              >
                                + {t("blockVideo")}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary text-xs"
                                onClick={() => addBlock(mod.id, lesson.id, "IMAGE")}
                              >
                                + {t("blockImage")}
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLesson(mod.id, lesson.id)}
                          className="text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary text-sm"
                    onClick={() => addLesson(mod.id)}
                  >
                    <Plus className="h-4 w-4" />
                    {t("addLesson")}
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4" />
                {tc("previous")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePublish}
                disabled={loading}
              >
                {loading ? tc("loading") : t("finish")}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
