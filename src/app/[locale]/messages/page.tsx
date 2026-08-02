import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { Inbox } from "@/components/messages/inbox";
import { requireUser } from "@/lib/auth";

type Props = { params: Promise<{ locale: string }> };

export default async function MessagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireUser(locale);
  const t = await getTranslations("messages");

  return (
    <AppShell title={t("title")}>
      <Inbox />
    </AppShell>
  );
}
