"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { getSession, signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { brandCta, brandGlassCard, formFocus } from "@/lib/brand";
import {
  firstNameSchema,
  lastNameSchema,
  mobileNumberSchema,
  otpSchema,
} from "@/lib/validations";
import { cn } from "@/lib/utils";

type Step = "mobile" | "otp" | "name";

function safeCallbackUrl(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  const [step, setStep] = useState<Step>("mobile");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [mobileError, setMobileError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setResendCooldownSeconds((seconds) => Math.max(seconds - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldownSeconds]);

  const finishLogin = async (normalizedMobile: string, otpCode: string) => {
    const result = await signIn("credentials", {
      mobileNumber: normalizedMobile,
      otp: otpCode,
      redirect: false,
    });

    if (result?.error) {
      throw new Error("خطا در ورود به سیستم");
    }

    const session = await getSession();
    if (session?.user?.isAdmin && callbackUrl === "/") {
      router.replace("/admin");
      return;
    }
    router.replace(callbackUrl);
  };

  const sendCode = async (normalizedMobile: string) => {
    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobileNumber: normalizedMobile }),
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(
        data.error || "خطا در ارسال کد تأیید",
      ) as Error & {
        retryAfterSeconds?: number;
      };
      if (response.status === 429 && data.retryAfterSeconds) {
        error.retryAfterSeconds = Number(data.retryAfterSeconds) || 60;
      }
      throw error;
    }
  };

  const handleMobileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMobileError("");

    const parsed = mobileNumberSchema.safeParse(mobileNumber);
    if (!parsed.success) {
      setMobileError(parsed.error.issues[0].message);
      return;
    }

    setMobileNumber(parsed.data);
    setIsLoading(true);
    try {
      await sendCode(parsed.data);
      setResendCooldownSeconds(60);
      setStep("otp");
    } catch (error) {
      const retryAfter =
        error && typeof error === "object" && "retryAfterSeconds" in error
          ? Number((error as { retryAfterSeconds?: number }).retryAfterSeconds)
          : 0;
      if (retryAfter > 0) setResendCooldownSeconds(retryAfter);
      setMobileError(
        error instanceof Error ? error.message : "خطا در ارتباط با سرور",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldownSeconds > 0) return;
    setOtpError("");
    const parsed = mobileNumberSchema.safeParse(mobileNumber);
    if (!parsed.success) {
      setOtpError(parsed.error.issues[0].message);
      return;
    }

    setIsResending(true);
    try {
      await sendCode(parsed.data);
      setOtp("");
      setResendCooldownSeconds(60);
    } catch (error) {
      const retryAfter =
        error && typeof error === "object" && "retryAfterSeconds" in error
          ? Number((error as { retryAfterSeconds?: number }).retryAfterSeconds)
          : 0;
      if (retryAfter > 0) setResendCooldownSeconds(retryAfter);
      setOtpError(
        error instanceof Error ? error.message : "خطا در ارتباط با سرور",
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setOtpError("");

    const otpCode = otp.replace(/\D/g, "");
    const otpParsed = otpSchema.safeParse(otpCode);
    if (!otpParsed.success) {
      setOtpError(otpParsed.error.issues[0].message);
      return;
    }

    const mobileParsed = mobileNumberSchema.safeParse(mobileNumber);
    if (!mobileParsed.success) {
      setOtpError(mobileParsed.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileNumber: mobileParsed.data,
          otp: otpCode,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setOtpError(data.error || "خطا در تأیید کد");
        return;
      }

      setOtp(otpCode);
      if (!data.userExists) {
        setStep("name");
        return;
      }

      await finishLogin(mobileParsed.data, otpCode);
    } catch (error) {
      setOtpError(
        error instanceof Error ? error.message : "خطا در ارتباط با سرور",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFirstNameError("");
    setLastNameError("");

    const firstNameResult = firstNameSchema.safeParse(firstName);
    const lastNameResult = lastNameSchema.safeParse(lastName);
    if (!firstNameResult.success) {
      setFirstNameError(firstNameResult.error.issues[0].message);
    }
    if (!lastNameResult.success) {
      setLastNameError(lastNameResult.error.issues[0].message);
    }
    if (!firstNameResult.success || !lastNameResult.success) return;

    const mobileParsed = mobileNumberSchema.safeParse(mobileNumber);
    const otpParsed = otpSchema.safeParse(otp.replace(/\D/g, ""));
    if (!mobileParsed.success || !otpParsed.success) {
      setFirstNameError("کد تأیید منقضی شده است. دوباره وارد شوید.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileNumber: mobileParsed.data,
          otp: otpParsed.data,
          firstName: firstNameResult.data,
          lastName: lastNameResult.data,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (String(data.error || "").includes("نام خانوادگی")) {
          setLastNameError(data.error);
        } else if (String(data.error || "").includes("نام")) {
          setFirstNameError(data.error);
        } else if (String(data.error || "").includes("کد تأیید")) {
          setOtpError(data.error);
          setStep("otp");
        } else {
          setFirstNameError(data.error || "خطا در ثبت‌نام");
        }
        return;
      }

      await finishLogin(mobileParsed.data, otpParsed.data);
    } catch (error) {
      setFirstNameError(
        error instanceof Error ? error.message : "خطا در ارتباط با سرور",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "authenticated" || status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <section className={cn(brandGlassCard, "p-5 sm:p-6")}>
      <header className="mb-5 space-y-1">
        <h1 className="text-xl font-bold text-white sm:text-2xl">
          {step === "mobile"
            ? "ورود به کمپین بنانا"
            : step === "otp"
              ? "کد تأیید"
              : "تکمیل اطلاعات"}
        </h1>
        <p className="text-sm text-white/50">
          {step === "mobile"
            ? "با شماره موبایل وارد شو یا حساب بساز."
            : step === "otp"
              ? `کد تأیید به شماره ${mobileNumber} ارسال شد`
              : "نام و نام خانوادگی‌ات را وارد کن."}
        </p>
      </header>

      {step === "mobile" && (
        <form onSubmit={handleMobileSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm text-white/55">شماره موبایل</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="09123456789"
              value={mobileNumber}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, "");
                if (value.length <= 12) {
                  setMobileNumber(value);
                  setMobileError("");
                }
              }}
              className={cn(
                "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-left text-base tracking-wider text-white",
                formFocus,
              )}
              dir="ltr"
              required
            />
            {mobileError && (
              <span className="text-xs text-rose-400">{mobileError}</span>
            )}
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              brandCta,
              "h-11 w-full px-5 text-sm disabled:opacity-50",
            )}
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            {isLoading ? "در حال ارسال..." : "ارسال کد تأیید"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleOtpSubmit} className="space-y-5">
          <label className="block space-y-1.5">
            <span className="text-sm text-white/55">کد تأیید ۶ رقمی</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                setOtpError("");
              }}
              className={cn(
                "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-center text-2xl font-bold tracking-[0.4em] text-white",
                formFocus,
              )}
              dir="ltr"
              required
            />
            {otpError && (
              <span className="block text-center text-xs text-rose-400">
                {otpError}
              </span>
            )}
          </label>
          <p className="text-center text-xs text-white/45">
            کد را دریافت نکردید؟{" "}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isResending || isLoading || resendCooldownSeconds > 0}
              className="text-brand underline decoration-brand/40 underline-offset-2 disabled:opacity-50"
            >
              {isResending
                ? "در حال ارسال..."
                : resendCooldownSeconds > 0
                  ? `ارسال مجدد (${resendCooldownSeconds.toLocaleString("fa-IR")})`
                  : "ارسال مجدد"}
            </button>
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStep("mobile");
                setOtp("");
                setOtpError("");
              }}
              className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 text-sm text-white/70 hover:bg-white/8"
            >
              بازگشت
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                brandCta,
                "h-11 flex-1 px-5 text-sm disabled:opacity-50",
              )}
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {isLoading ? "در حال ورود..." : "ورود"}
            </button>
          </div>
        </form>
      )}

      {step === "name" && (
        <form onSubmit={handleNameSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm text-white/55">نام</span>
            <input
              value={firstName}
              onChange={(event) => {
                setFirstName(event.target.value);
                setFirstNameError("");
              }}
              className={cn(
                "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white",
                formFocus,
              )}
              required
            />
            {firstNameError && (
              <span className="text-xs text-rose-400">{firstNameError}</span>
            )}
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm text-white/55">نام خانوادگی</span>
            <input
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);
                setLastNameError("");
              }}
              className={cn(
                "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white",
                formFocus,
              )}
              required
            />
            {lastNameError && (
              <span className="text-xs text-rose-400">{lastNameError}</span>
            )}
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStep("otp");
                setFirstNameError("");
                setLastNameError("");
              }}
              className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 text-sm text-white/70 hover:bg-white/8"
            >
              بازگشت
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                brandCta,
                "h-11 flex-1 px-5 text-sm disabled:opacity-50",
              )}
            >
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {isLoading ? "در حال ثبت‌نام..." : "ادامه"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center justify-center gap-3">
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
      </div>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
      <div className="mt-6 flex items-center justify-center gap-4 text-sm text-white/40">
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
