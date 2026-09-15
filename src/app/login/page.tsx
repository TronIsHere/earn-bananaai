"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm, safeCallbackUrl } from "@/components/login-form";
import {
  DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN,
  REVIEW_SLA_HOURS,
} from "@/lib/earn";
import { formatToman, formatTomanCompact } from "@/lib/utils";

function LoginFormFromQuery() {
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  return <LoginForm callbackUrl={callbackUrl} />;
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex justify-center">
        <BrandMark />
      </div>
      <p className="mb-6 text-center text-sm leading-relaxed text-white/55">
        با هوش مصنوعی ویدیو بساز، در اینستاگرام پست کن و برای هر ریل تا{" "}
        <strong className="text-brand">
          {formatTomanCompact(DEFAULT_MAX_PAYOUT_PER_VIDEO_TOMAN)} تومان
        </strong>{" "}
        بگیر.
      </p>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        }
      >
        <LoginFormFromQuery />
      </Suspense>
      <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px] text-white/45">
        {[
          `بررسی ${formatToman(REVIEW_SLA_HOURS)} ساعته`,
          "واریز به شبا یا کارت",
          "عضویت رایگان",
        ].map((item) => (
          <li key={item} className="inline-flex items-center gap-1">
            <BadgeCheck className="size-3.5 text-brand" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-center gap-4 text-sm text-white/40">
        <Link href="/" className="transition-colors hover:text-brand">
          صفحه اصلی
        </Link>
        <span className="text-white/20">·</span>
        <Link href="/help" className="transition-colors hover:text-brand">
          راهنمای کاربران
        </Link>
        <span className="text-white/20">·</span>
        <Link href="/rules" className="transition-colors hover:text-brand">
          قوانین برنامه
        </Link>
      </div>
    </div>
  );
}
