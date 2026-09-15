"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { InstagramIcon } from "@/components/platform-icons";
import { useStore } from "@/components/store-provider";
import {
  brandCta,
  brandCtaGhost,
  brandGlassCard,
  formFocus,
  formInput,
} from "@/lib/brand";
import { normalizeInstagramHandle } from "@/lib/instagram";
import { VERIFICATION_CODE_PREFIX } from "@/lib/verification-code";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { ReviewSlaNotice, ReviewSlaPromise } from "@/components/review-sla";

const statusMeta: Record<
  string,
  { label: string; className: string }
> = {
  verified: { label: "تأیید شده", className: "border-cash/30 bg-cash/12 text-cash" },
  pending: { label: "در انتظار بررسی", className: "border-amber-500/25 bg-amber-500/12 text-amber-200" },
  rejected: { label: "رد شده", className: "border-rose-500/30 bg-rose-500/12 text-rose-200" },
  none: { label: "شروع نشده", className: "border-white/10 bg-white/6 text-white/50" },
};

const steps = [
  { n: "۱", text: "نام کاربری اینستاگرامت را وارد کن" },
  { n: "۲", text: "کد را کپی کن و در بیوی پیج بگذار" },
  { n: "۳", text: "درخواست بررسی بده" },
];

function applyVerification(data: {
  instagramHandle?: string | null;
  instagramStatus?: Profile["instagramStatus"];
  verificationCode?: string;
  verificationNote?: string | null;
  verificationRequestedAt?: string | null;
}): Partial<Profile> {
  return {
    instagramHandle: data.instagramHandle ?? null,
    instagramStatus: data.instagramStatus ?? "none",
    verificationCode: data.verificationCode ?? "",
    verificationNote: data.verificationNote ?? null,
    verificationRequestedAt: data.verificationRequestedAt ?? null,
  };
}

export function InstagramVerificationCard() {
  const { state, updateProfile } = useStore();
  const p = state.profile;
  const [handle, setHandle] = useState(p.instagramHandle ?? "");
  const [busy, setBusy] = useState<"start" | "review" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (p.instagramHandle) setHandle(p.instagramHandle);
  }, [p.instagramHandle]);

  const status = p.instagramStatus;
  const code = p.verificationCode;
  const hasCode = Boolean(code);
  const verified = status === "verified";
  const pending = status === "pending";
  const normalizedHandle = normalizeInstagramHandle(handle);
  const handleChanged =
    Boolean(normalizedHandle) && normalizedHandle !== (p.instagramHandle ?? "");
  const showStart = !verified && !pending && (handleChanged || !hasCode);

  async function post(body: Record<string, string>) {
    setError(null);
    const response = await fetch("/api/user/earn/verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json()) as {
      error?: string;
      instagramHandle?: string | null;
      instagramStatus?: Profile["instagramStatus"];
      verificationCode?: string;
      verificationNote?: string | null;
      verificationRequestedAt?: string | null;
    };
    if (!response.ok) {
      throw new Error(data.error || "درخواست ناموفق بود");
    }
    updateProfile(applyVerification(data));
    if (data.instagramHandle) setHandle(data.instagramHandle);
  }

  const start = async () => {
    setBusy("start");
    try {
      await post({ action: "start", handle });
    } catch (err) {
      setError(err instanceof Error ? err.message : "درخواست ناموفق بود");
    } finally {
      setBusy(null);
    }
  };

  const requestReview = async () => {
    setBusy("review");
    try {
      await post({ action: "request_review" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "درخواست ناموفق بود");
    } finally {
      setBusy(null);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("کپی در این مرورگر در دسترس نیست. متن را دستی انتخاب کن.");
    }
  };

  const meta = statusMeta[status] || statusMeta.none;

  return (
    <section
      className={cn(
        brandGlassCard,
        "space-y-4 p-5 sm:p-6",
        verified ? "border-cash/30" : "border-brand/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl",
            verified ? "bg-cash text-brand-ink" : "bg-brand text-brand-ink"
          )}
        >
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-white">تأیید پیج اینستاگرام</h2>
            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", meta.className)}>
              {meta.label}
            </span>
            {!verified && <ReviewSlaPromise />}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-white/55">
            {verified
              ? "پیجت تأیید شده و می‌توانی در همه کمپین‌ها شرکت کنی."
              : "با این کار مطمئن می‌شویم پیج مال خودت است. فقط سه قدم است."}
          </p>
        </div>
      </div>

      {!verified && (
        <ol className="grid gap-2 sm:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.n}
              className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-xs text-white/70"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">
                {step.n}
              </span>
              {step.text}
            </li>
          ))}
        </ol>
      )}

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-white/55">نام کاربری اینستاگرام</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-white/35">
            @
          </span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="your.handle"
            disabled={pending || verified}
            dir="ltr"
            className={cn(
              formInput,
              "h-12 pl-9 text-left",
              formFocus,
              (pending || verified) && "opacity-70"
            )}
          />
        </div>
      </label>

      {showStart && (
        <button
          type="button"
          onClick={start}
          disabled={busy !== null || !normalizedHandle}
          className={cn(brandCtaGhost, "h-11 px-4 text-sm")}
        >
          {busy === "start" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <InstagramIcon className="size-4" />
          )}
          دریافت کد بیو
        </button>
      )}

      {hasCode && (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-white/50">
            این متن را عیناً در بیوی اینستاگرام بگذار. شکل کد شبیه{" "}
            <span className="text-white/70">{VERIFICATION_CODE_PREFIX} - 4F7K</span>{" "}
            است.
          </p>
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-brand/40 bg-brand/[0.06] px-4 py-3.5">
            <code
              className="flex-1 text-left text-base font-extrabold tracking-wide text-brand"
              dir="ltr"
            >
              {code}
            </code>
            <button
              type="button"
              onClick={copyCode}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
                copied
                  ? "bg-cash/15 text-cash"
                  : "bg-brand text-brand-ink hover:bg-brand-soft"
              )}
            >
              {copied ? (
                <>
                  <Check className="size-3.5" />
                  کپی شد
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  کپی کد
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {status === "rejected" && p.verificationNote && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {p.verificationNote}
        </p>
      )}

      {verified && (
        <p className="inline-flex items-center gap-2 rounded-xl border border-cash/25 bg-cash/10 px-3 py-2 text-sm text-cash">
          <Check className="size-4" />
          پیج {p.instagramHandle ? `@${p.instagramHandle}` : ""} تأیید شد. حالا می‌توانی
          پست ثبت کنی.
        </p>
      )}

      {pending && (
        <div className="space-y-1 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-3 py-2.5">
          <p className="text-sm font-semibold text-amber-100">
            درخواست ثبت شد. تا پایان بررسی، بیو را تغییر نده.
          </p>
          <ReviewSlaNotice startedAt={p.verificationRequestedAt} />
        </div>
      )}

      {hasCode && (status === "none" || status === "rejected") && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={requestReview}
            disabled={busy !== null}
            className={cn(brandCta, "h-11 px-5 text-sm")}
          >
            {busy === "review" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            درخواست بررسی
          </button>
          <p className="text-xs text-white/40">
            بعد از گذاشتن کد در بیو، درخواست بده. بررسی حداکثر ۴۸ ساعت. زمان
            دقیق نتیجه را بلافاصله می‌بینی.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-rose-300">{error}</p>}
    </section>
  );
}
