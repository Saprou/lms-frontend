import { setRequestLocale } from "next-intl/server";
import { TakeExamClient } from "@/components/exam/take-exam-client";
import { requireUser } from "@/lib/auth";

type Props = { params: Promise<{ locale: string; examId: string }> };

export default async function TakeExamPage({ params }: Props) {
  const { locale, examId } = await params;
  setRequestLocale(locale);

  await requireUser(locale);

  return <TakeExamClient examId={examId} />;
}
