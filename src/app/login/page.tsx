"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LoginForm, safeCallbackUrl } from "@/components/login-form";

function LoginFormFromQuery() {
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  return <LoginForm callbackUrl={callbackUrl} />;
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center justify-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/img/logo.jpeg"
            alt="بنانا"
            width={44}
            height={44}
            className="size-11"
          />
          <div>
            <div className="text-lg font-bold text-white">کمپین بنانا</div>
            <p className="text-[11px] text-white/45">برنامه رسمی کسب درآمد</p>
          </div>
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        }
      >
        <LoginFormFromQuery />
      </Suspense>
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
