"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Globe } from "lucide-react";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: string) {
    if (next === locale) return;
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/") || `/${next}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-white px-2 py-1 text-sm">
      <Globe className="h-3.5 w-3.5 text-muted" />
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={`rounded-full px-2 py-0.5 ${locale === "en" ? "bg-primary-soft text-primary font-semibold" : "text-muted"}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo("ar")}
        className={`rounded-full px-2 py-0.5 ${locale === "ar" ? "bg-primary-soft text-primary font-semibold" : "text-muted"}`}
      >
        عربي
      </button>
    </div>
  );
}
