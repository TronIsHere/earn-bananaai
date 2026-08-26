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
  verified: { label: "تأیید شده", className: "bg-emerald-500/15 text-emerald-300" },
  pending: { label: "در انتظار بررسی", className: "bg-amber-500/15 text-amber-300" },
  rejected: { label: "رد شده", className: "bg-rose-500/15 text-rose-300" },
  none: { label: "شروع نشده", className: "bg-white/10 text-white/45" },
};

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
    <section className={cn(brandGlassCard, "space-y-4 p-5")}>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-white">تأیید اینستاگرام</h2>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px]", meta.className)}>
              {meta.label}
            </span>
            <ReviewSlaPromise />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-white/55">
            نام کاربری را وارد کن، کد بیو را در پروفایل اینستاگرام بگذار، بعد
            درخواست بررسی بده. بررسی حداکثر ۴۸ ساعت طول می‌کشد و زمان دقیق نتیجه
            را همین‌جا می‌بینی.
          </p>
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs text-white/50">نام کاربری اینستاگرام</span>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-white/35">
            @
          </span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="your.handle"
            disabled={pending || verified}
            dir="ltr"
            className={cn(
              "w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pr-8 pl-3 text-left text-sm text-white",
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
          className={cn(brandCtaGhost, "px-4 py-2.5 text-sm disabled:opacity-50")}
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
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-brand/35 bg-black/20 px-4 py-3">
            <code
              className="flex-1 text-left text-sm font-bold text-brand"
              dir="ltr"
            >
              {code}
            </code>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
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
        <p className="text-sm text-emerald-300">
          حساب اینستاگرام تأیید شد. می‌توانی در کمپین‌ها شرکت کنی.
        </p>
      )}

      {pending && (
        <div className="space-y-1">
          <p className="text-sm text-amber-200/90">
            درخواست ثبت شد. بیو را تغییر نده تا بررسی تمام شود.
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
            className={cn(brandCta, "px-5 py-2.5 text-sm disabled:opacity-50")}
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
