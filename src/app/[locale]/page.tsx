import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookOpen, ArrowRight } from "lucide-react";
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
  const th = await getTranslations("home");
  const user = await getServerUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-6 py-4 md:justify-between">
          <div className="hidden items-center gap-3 md:flex">
            <Image
              src="/mohamed-elsayed.png"
              alt={tc("appName")}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-primary-border"
              priority
            />
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
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--primary-soft),_transparent_55%),linear-gradient(180deg,_#fff_0%,_var(--background)_100%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-20">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-medium text-primary">
                <BookOpen className="h-4 w-4" />
                {th("badge")}
              </div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                {tc("appName")}
              </h1>
              <p className="mt-2 text-lg font-medium text-primary md:text-xl">
                {th("role")}
              </p>
              <p className="mt-5 max-w-xl text-lg text-muted">
                {th("tagline")}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">

                {user ? (
                  <Link
                    href={`/${locale}/dashboard`}
                    className="btn btn-secondary px-6 py-3 text-base"
                  >
                    {t("dashboard")}
                  </Link>
                ) : (
                  <>
                    <Link
                      href={`/${locale}/login`}
                      className="btn btn-secondary px-6 py-3 text-base"
                    >
                      {tc("login")}
                    </Link>
                    <Link
                      href={`/${locale}/signup`}
                      className="btn btn-secondary px-6 py-3 text-base"
                    >
                      {tc("signup")}
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-primary-border bg-white shadow-[0_24px_60px_rgba(16,24,40,0.12)]">
                <Image
                  src="/mohamed-elsayed.png"
                  alt={tc("appName")}
                  width={640}
                  height={640}
                  className="aspect-square w-full object-cover object-top"
                  priority
                />
                <div className="border-t border-border px-5 py-4">
                  <p className="text-lg font-bold tracking-tight">{tc("appName")}</p>
                  <p className="text-sm text-muted">{th("role")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 md:grid-cols-3">
            {[
              { title: th("feature1Title"), desc: th("feature1Desc") },
              { title: th("feature2Title"), desc: th("feature2Desc") },
              { title: th("feature3Title"), desc: th("feature3Desc") },
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
