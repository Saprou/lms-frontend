import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { CalendarView } from "@/components/calendar/calendar-view";
import { requireUser } from "@/lib/auth";

type Props = { params: Promise<{ locale: string }> };

export default async function CalendarPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireUser(locale);
  const t = await getTranslations("calendar");

  return (
    <AppShell title={t("title")}>
      <CalendarView />
    </AppShell>
  );
}
