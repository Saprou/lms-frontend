import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GraduationCap, BookOpen, ArrowRight } from "lucide-react";
import { getServerUser } from "@/lib/auth";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("nav");
  const tc = await getTranslations("common");
  const user = await getServerUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">{tc("appName")}</span>
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            {user ? (
              <Link href={`/${locale}/dashboard`} className="btn btn-primary">
                {t("dashboard")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href={`/${locale}/login`} className="btn btn-secondary">
                  {tc("login")}
                </Link>
                <Link href={`/${locale}/signup`} className="btn btn-primary">
                  {tc("signup")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-medium text-primary">
            <BookOpen className="h-4 w-4" />
            {t("browse")}
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Learn without limits on{" "}
            <span className="text-primary">{tc("appName")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Discover courses from expert instructors, track your progress, and
            master new skills with interactive lessons and quizzes.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href={`/${locale}/courses`} className="btn btn-primary px-6 py-3 text-base">
              {t("browse")}
            </Link>
            {user ? (
              <Link href={`/${locale}/dashboard`} className="btn btn-secondary px-6 py-3 text-base">
                {t("dashboard")}
              </Link>
            ) : (
              <>
                <Link href={`/${locale}/login`} className="btn btn-secondary px-6 py-3 text-base">
                  {tc("login")}
                </Link>
                <Link href={`/${locale}/signup`} className="btn btn-secondary px-6 py-3 text-base">
                  {tc("signup")}
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="border-t border-border bg-white py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
            {[
              {
                title: "Expert instructors",
                desc: "Learn from professionals with real-world experience.",
              },
              {
                title: "Track progress",
                desc: "Resume videos where you left off and mark lessons complete.",
              },
              {
                title: "Interactive quizzes",
                desc: "Test your knowledge with auto-graded quizzes in every lesson.",
              },
            ].map((item) => (
              <div key={item.title} className="card p-6">
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
