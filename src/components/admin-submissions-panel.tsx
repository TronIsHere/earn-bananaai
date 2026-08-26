"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ExternalLink,
  Inbox,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { SectionBadge } from "@/components/section-badge";
import {
  ReviewSlaBadge,
  ReviewSlaQueueBanner,
  reviewSlaCardClass,
} from "@/components/review-sla";
import { FIXABLE_REJECT_REASONS, MAX_SUBMISSION_RESUBMITS } from "@/lib/earn";
import type { AdminSubmissionJson } from "@/lib/earn-submissions-types";
import {
  brandCta,
  brandGlassCard,
  formFocus,
} from "@/lib/brand";
import { cn, formatDate, formatToman } from "@/lib/utils";

export function AdminSubmissionsPanel() {
  const [submissions, setSubmissions] = useState<AdminSubmissionJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/earn/submissions?status=review");
      const data = (await res.json()) as {
        submissions?: AdminSubmissionJson[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "بارگذاری ارسال‌ها ناموفق بود");
        setSubmissions([]);
        return;
      }
      setSubmissions(data.submissions ?? []);
    } catch {
      setError("بارگذاری ارسال‌ها ناموفق بود");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionBadge icon={Inbox}>صف بررسی</SectionBadge>
          <h2 className="mt-2 text-xl font-bold text-white">ارسال‌های در انتظار</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            SLA بررسی حداکثر ۴۸ ساعت است. قدیمی‌ترین ارسال‌ها بالاترند. برای
            ایراد قابل اصلاح (مثل هشتگ جا مانده) رد با امکان یک‌بار ارسال مجدد
            بزنید تا سازنده کارش را از دست ندهد.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white"
        >
          <RefreshCw className="size-4" />
          نوسازی
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-brand" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-950/20 px-4 py-6 text-sm text-rose-200">
          {error}
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-white/45">
          ارسالی در صف بررسی نیست.
        </div>
      ) : (
        <div className="space-y-3">
          <ReviewSlaQueueBanner
            startedAts={submissions.map(
              (sub) => sub.resubmittedAt ?? sub.createdAt
            )}
          />
          {submissions.map((sub) => (
            <ReviewCard
              key={sub.id}
              submission={sub}
              onDone={(id) =>
                setSubmissions((prev) => prev.filter((row) => row.id !== id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  submission,
  onDone,
}: {
  submission: AdminSubmissionJson;
  onDone: (id: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const alreadyResubmitted =
    (submission.resubmitCount ?? 0) >= MAX_SUBMISSION_RESUBMITS;
  const [allowResubmit, setAllowResubmit] = useState(!alreadyResubmitted);
  const [saving, setSaving] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const creatorName = submission.user
    ? `${submission.user.firstName} ${submission.user.lastName}`.trim()
    : "کاربر";
  const base =
    submission.campaign?.basePayoutToman ?? submission.basePayoutToman;
  const willAllowResubmit = allowResubmit && !alreadyResubmitted;

  const review = async (decision: "approve" | "reject") => {
    if (decision === "reject" && reason.trim().length < 3) {
      setError("دلیل رد کردن را بنویسید");
      return;
    }
    setSaving(decision);
    setError(null);
    try {
      const res = await fetch(`/api/admin/earn/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          decision === "approve"
            ? { decision: "approve" }
            : {
                decision: "reject",
                reason: reason.trim(),
                allowResubmit: willAllowResubmit,
              }
        ),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "بررسی ناموفق بود");
        return;
      }
      setDone(
        decision === "approve"
          ? `${formatToman(base)} تومان پاداش پایه واریز شد.`
          : willAllowResubmit
            ? "رد شد؛ سازنده یک‌بار می‌تواند اصلاح کند."
            : "ارسال رد شد."
      );
      window.setTimeout(() => onDone(submission.id), 1000);
    } catch {
      setError("بررسی ناموفق بود");
    } finally {
      setSaving(null);
    }
  };

  return (
    <article
      className={cn(
        brandGlassCard,
        "p-4 sm:p-5",
        reviewSlaCardClass(submission.resubmittedAt ?? submission.createdAt)
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white">
              {submission.campaign?.title || "کمپین"}
            </h3>
            {alreadyResubmitted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-200">
                <RotateCcw className="size-3" />
                ارسال مجدد
              </span>
            )}
            <ReviewSlaBadge startedAt={submission.resubmittedAt ?? submission.createdAt} />
          </div>
          <p className="mt-1 text-sm text-white/55">
            {creatorName}
            {submission.user?.instagramHandle
              ? ` · @${submission.user.instagramHandle}`
              : ""}
          </p>
          <div className="mt-1 text-xs text-white/40">
            {formatDate(submission.createdAt)}
            {submission.user?.mobileNumber
              ? ` · ${submission.user.mobileNumber}`
              : ""}
          </div>
        </div>
        <div className="text-left text-xs text-white/45">
          پاداش پایه {formatToman(base)} تومان
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a
          href={submission.instagramPostUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-brand hover:text-brand-soft"
        >
          مشاهده پست
          <ExternalLink className="size-3.5" />
        </a>
        {submission.proofScreenshotUrl && (
          <a
            href={submission.proofScreenshotUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-white/55 hover:text-white"
          >
            اسکرین‌شات
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      {submission.proofScreenshotUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={submission.proofScreenshotUrl}
          alt="اسکرین‌شات اثبات"
          className="mt-3 max-h-64 rounded-xl border border-white/10 object-contain"
        />
      )}

      {alreadyResubmitted && submission.reviewerNote && (
        <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-sm text-amber-100/90">
          درخواست اصلاح قبلی: {submission.reviewerNote}
        </p>
      )}

      {done ? (
        <p className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200">
          {done}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {rejecting && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {FIXABLE_REJECT_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                      reason === preset
                        ? "border-brand/40 bg-brand/15 text-brand"
                        : "border-white/10 text-white/55 hover:border-white/20 hover:text-white"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs text-white/45">
                  دلیل رد
                </span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="مثلا هشتگ الزامی رعایت نشده"
                  className={cn(
                    "min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-white/35",
                    formFocus
                  )}
                />
              </label>
              {alreadyResubmitted ? (
                <p className="text-xs text-white/45">
                  این ارسال یک‌بار اصلاح شده؛ رد بعدی نهایی است.
                </p>
              ) : (
                <label className="flex items-start gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={allowResubmit}
                    onChange={(event) => setAllowResubmit(event.target.checked)}
                    className="mt-0.5 size-4 rounded border-white/20 bg-black/30 accent-brand"
                  />
                  <span>
                    اجازه یک‌بار ارسال مجدد (ایراد قابل اصلاح مثل هشتگ جا مانده)
                  </span>
                </label>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void review("approve")}
              disabled={saving !== null}
              className={cn(brandCta, "px-4 py-2.5 text-sm disabled:opacity-50")}
            >
              {saving === "approve" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              تأیید و واریز پایه
            </button>
            {rejecting ? (
              <>
                <button
                  type="button"
                  onClick={() => void review("reject")}
                  disabled={saving !== null}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 hover:bg-rose-500/15 disabled:opacity-50"
                >
                  {saving === "reject" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                  {willAllowResubmit ? "رد با امکان اصلاح" : "رد نهایی"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejecting(false);
                    setError(null);
                  }}
                  className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5"
                >
                  انصراف
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-500/30 px-4 py-2.5 text-sm text-rose-200 hover:bg-rose-500/10"
              >
                <X className="size-4" />
                رد کردن
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
    </article>
  );
}
