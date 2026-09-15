"use client";

import { useEffect, useState } from "react";
import { getSession, signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Smartphone } from "lucide-react";
import { brandCta, brandGlassCard, formFocus, formInput } from "@/lib/brand";
import {
  firstNameSchema,
  lastNameSchema,
  mobileNumberSchema,
  otpSchema,
} from "@/lib/validations";
import { cn } from "@/lib/utils";

type Step = "mobile" | "otp" | "name";

export function safeCallbackUrl(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export function LoginForm({
  callbackUrl = "/",
  stayVisibleWhileLoading = false,
  className,
}: {
  callbackUrl?: string;
  stayVisibleWhileLoading?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { status } = useSession();

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

  if (status === "authenticated" || (status === "loading" && !stayVisibleWhileLoading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  const stepIndex = step === "mobile" ? 0 : step === "otp" ? 1 : 2;

  return (
    <section
      id="login"
      className={cn(
        brandGlassCard,
        "relative scroll-mt-24 overflow-hidden p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:p-6",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -left-16 -top-20 size-48 rounded-full bg-brand/12 blur-3xl"
        aria-hidden
      />
      <header className="relative mb-5 space-y-2">
        <div className="flex items-center gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1 rounded-full transition-all",
                i <= stepIndex ? "w-6 bg-brand" : "w-3 bg-white/12",
              )}
            />
          ))}
        </div>
        <h2 className="text-xl font-extrabold text-white sm:text-2xl">
          {step === "mobile"
            ? "همین حالا شروع کن"
            : step === "otp"
              ? "کد تأیید را وارد کن"
              : "اسمت را بگو"}
        </h2>
        <p className="text-sm text-white/50">
          {step === "mobile"
            ? "ورود یا ثبت‌نام با شماره موبایل. کمتر از یک دقیقه."
            : step === "otp"
              ? (
                <>
                  کد ۶ رقمی به{" "}
                  <span className="font-semibold text-white" dir="ltr">
                    {mobileNumber}
                  </span>{" "}
                  پیامک شد.
                </>
              )
              : "نام و نام خانوادگی برای واریز پول لازم است."}
        </p>
      </header>

      {step === "mobile" && (
        <form onSubmit={handleMobileSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-white/55">شماره موبایل</span>
            <div className="relative">
              <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="0912 345 6789"
                value={mobileNumber}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, "");
                  if (value.length <= 12) {
                    setMobileNumber(value);
                    setMobileError("");
                  }
                }}
                className={cn(
                  formInput,
                  "h-12 pl-10 text-left text-base tracking-[0.12em]",
                  formFocus,
                  mobileError && "border-rose-500/50",
                )}
                dir="ltr"
                required
              />
            </div>
            {mobileError && (
              <span className="block text-xs text-rose-400">{mobileError}</span>
            )}
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className={cn(brandCta, "h-12 w-full px-5 text-sm")}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4 rotate-180" />
            )}
            {isLoading ? "در حال ارسال..." : "دریافت کد تأیید"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleOtpSubmit} className="space-y-5">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-white/55">کد تأیید ۶ رقمی</span>
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
                formInput,
                "h-14 text-center text-3xl font-black tracking-[0.45em]",
                formFocus,
                otpError && "border-rose-500/50",
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
              className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 text-sm text-white/70 transition-colors hover:bg-white/8"
            >
              بازگشت
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={cn(brandCta, "h-12 flex-[2] px-5 text-sm")}
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
            <span className="text-xs font-semibold text-white/55">نام</span>
            <input
              value={firstName}
              onChange={(event) => {
                setFirstName(event.target.value);
                setFirstNameError("");
              }}
              className={cn(formInput, "h-12", formFocus)}
              required
            />
            {firstNameError && (
              <span className="text-xs text-rose-400">{firstNameError}</span>
            )}
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-white/55">نام خانوادگی</span>
            <input
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);
                setLastNameError("");
              }}
              className={cn(formInput, "h-12", formFocus)}
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
              className="h-12 flex-1 rounded-2xl border border-white/10 bg-white/5 text-sm text-white/70 transition-colors hover:bg-white/8"
            >
              بازگشت
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={cn(brandCta, "h-12 flex-[2] px-5 text-sm")}
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
