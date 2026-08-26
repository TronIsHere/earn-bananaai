"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, UserRound } from "lucide-react";
import { InstagramVerificationCard } from "@/components/instagram-verification-card";
import { SectionBadge } from "@/components/section-badge";
import { useStore } from "@/components/store-provider";
import {
  brandCta,
  brandGlassCard,
  brandHeadlineGradient,
  formFocus,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { ready, state, updateProfile, persistProfile } = useStore();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  const p = state.profile;

  const save = async () => {
    setSaving(true);
    setSaveError("");
    const ok = await persistProfile();
    setSaving(false);
    if (!ok) {
      setSaveError("ذخیره نشد. دوباره تلاش کنید.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <SectionBadge icon={UserRound}>حساب کاربری</SectionBadge>
        <h1 className={cn("mt-2 text-2xl font-bold", brandHeadlineGradient)}>
          پروفایل
        </h1>
        <p className="mt-1 text-sm text-white/55">
          اطلاعات حساب و تأیید اینستاگرام برای شرکت در کمپین‌ها.{" "}
          <Link
            href="/help/taeed-instagram"
            className="text-brand hover:text-brand-soft"
          >
            راهنمای تأیید پیج
          </Link>
        </p>
      </header>

      <section className={cn(brandGlassCard, "space-y-4 p-5")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="نام"
            value={p.firstName}
            onChange={(v) => updateProfile({ firstName: v })}
          />
          <Field
            label="نام خانوادگی"
            value={p.lastName}
            onChange={(v) => updateProfile({ lastName: v })}
          />
        </div>
        <Field
          label="موبایل"
          value={p.mobileNumber}
          readOnly
          hint="شماره موبایل همان حساب ورود است و قابل تغییر نیست."
        />

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={cn(brandCta, "px-5 py-2.5 text-sm disabled:opacity-50")}
        >
          {saving ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-4 animate-spin" />
              در حال ذخیره
            </span>
          ) : saved ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" />
              ذخیره شد
            </span>
          ) : (
            "ذخیره تغییرات"
          )}
        </button>
        {saveError && <p className="text-xs text-rose-400">{saveError}</p>}
      </section>

      <InstagramVerificationCard />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  hint?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-white/50">{label}</span>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white",
          readOnly && "text-white/60",
          formFocus
        )}
      />
      {hint && <span className="text-[11px] text-white/35">{hint}</span>}
    </label>
  );
}
