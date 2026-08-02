import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { NewExamForm } from "@/components/exam/new-exam-form";
import { requireRole } from "@/lib/auth";
import { serverApi } from "@/lib/api-server";

type Props = { params: Promise<{ locale: string }> };

export default async function NewExamPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireRole("INSTRUCTOR", locale);
  const t = await getTranslations("exam");

  const dashboard = await serverApi<{
    courses: { id: string; title: string }[];
  }>("/api/dashboard");

  const courses = dashboard.courses.map((c) => ({ id: c.id, title: c.title }));

  return (
    <AppShell title={t("create")}>
      <NewExamForm courses={courses} />
    </AppShell>
  );
}
