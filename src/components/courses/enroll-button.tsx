"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { clientApi } from "@/lib/api-client";
import { useAuth } from "@/components/providers/auth-provider";

type Props = {
  courseId: string;
  enrolled: boolean;
};

export function EnrollButton({ courseId, enrolled: initialEnrolled }: Props) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [loading, setLoading] = useState(false);

  async function handleEnroll() {
    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }

    setLoading(true);
    try {
      await clientApi(`/api/courses/${courseId}/enroll`, { method: "POST" });
      setEnrolled(true);
      toast.success(t("enrolled"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setLoading(false);
    }
  }

  if (enrolled) {
    return (
      <button type="button" className="btn btn-secondary" disabled>
        {t("enrolled")}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={handleEnroll}
      disabled={loading}
    >
      {loading ? t("loading") : t("enroll")}
    </button>
  );
}
