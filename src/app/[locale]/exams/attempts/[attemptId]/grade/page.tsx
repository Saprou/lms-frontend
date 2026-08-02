import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { GradeAttemptClient } from "@/components/exam/grade-attempt-client";
import { requireRole } from "@/lib/auth";

type Props = { params: Promise<{ locale: string; attemptId: string }> };

export default async function GradeAttemptPage({ params }: Props) {
  const { locale, attemptId } = await params;
  setRequestLocale(locale);

  await requireRole("INSTRUCTOR", locale);
  const t = await getTranslations("exam");

  return (
    <AppShell title={t("review")}>
      <GradeAttemptClient attemptId={attemptId} />
    </AppShell>
  );
}
