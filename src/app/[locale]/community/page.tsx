import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { CommunityFeed } from "@/components/community/community-feed";
import { requireUser } from "@/lib/auth";

type Props = { params: Promise<{ locale: string }> };

export default async function CommunityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireUser(locale);
  const t = await getTranslations("community");

  return (
    <AppShell title={t("title")}>
      <CommunityFeed />
    </AppShell>
  );
}
