"use client";

import Link from "next/link";
import { ArrowUpLeft, Sparkles } from "lucide-react";
import { useNow } from "@/components/review-sla";
import {
  MIN_PAID_VIEWS,
  REVIEW_SLA_HOURS,
  reviewSlaSnapshot,
} from "@/lib/earn";
import type { UserSubmissionJson } from "@/lib/earn-submissions-types";
import {
  cn,
  formatDateTime,
  formatDayMonth,
  formatRemainingDuration,
  formatToman,
  formatTomanCompact,
} from "@/lib/utils";

/**
 * "What happens next" for one submission: the step the creator is in now,
 * with a real date or countdown, and the steps after it. Waiting is where
 * creators drop off, so every wait gets a date.
 */

interface Step {
  key: string;
  title: string;
  detail: string;
  now?: boolean;
}

function stepsFor(sub: UserSubmissionJson, now: Date): Step[] {
  // Higher creator levels get a shorter review clock.
  const slaHoursValue = sub.reviewSlaHours ?? REVIEW_SLA_HOURS;
  const slaHours = formatToman(slaHoursValue);
  const day7 = sub.day7OpensAt ? formatDayMonth(sub.day7OpensAt) : null;
  const payStep: Step = {
    key: "pay",
    title: "واریز پاداش به کیف پول",
    detail: `اگر به ${formatToman(MIN_PAID_VIEWS)} بازدید برسد، طبق پله‌های کمپین`,
  };

  switch (sub.status) {
    case "pending": {
      const sla = reviewSlaSnapshot(
        sub.resubmittedAt ?? sub.createdAt,
        now,
        slaHoursValue
      );
      return [
        {
          key: "review",
          now: true,
          title: sub.resubmitCount > 0 ? "بررسی دوباره پست اصلاح‌شده" : "بررسی پست",
          detail: !sla
            ? `حداکثر ${slaHours} ساعت`
            : sla.tone === "overdue"
              ? "مهلت گذشته و در اولویت صف است"
              : `نتیجه تا ${formatDateTime(sla.dueAt)} · ${formatRemainingDuration(sla.remainingMs)}`,
        },
        {
          key: "day7",
          title: "ارسال اینسایت روز هفتم",
          detail: day7 ? `از ${day7}` : "هفت روز بعد از ارسال",
        },
        payStep,
      ];
    }
    case "approved":
    case "bonus_pending": {
      if (sub.day7ProofSubmittedAt) {
        return [
          {
            key: "check",
            now: true,
            title: "ادمین عدد بازدید را چک می‌کند",
            detail: `اینسایت ${formatDayMonth(sub.day7ProofSubmittedAt)} رسید`,
          },
          payStep,
        ];
      }
      if (sub.day7InsightsOpen) {
        return [
          {
            key: "insights",
            now: true,
            title: "الان اینسایت را بفرست",
            detail: "هر چه زودتر بفرستی، پاداشت زودتر نهایی می‌شود",
          },
          payStep,
        ];
      }
      return [
        {
          key: "wait",
          now: true,
          title: "ریلت در حال جمع کردن بازدید است",
          detail: day7 ? `ثبت بازدید از ${day7}` : "تا روز هفتم",
        },
        {
          key: "day7",
          title: "ارسال اینسایت روز هفتم",
          detail: "عدد بازدید و یک اسکرین‌شات از اینسایت",
        },
        payStep,
      ];
    }
    case "changes_requested":
      return [
        {
          key: "fix",
          now: true,
          title: "همان پست را اصلاح کن و دوباره بفرست",
          detail: "فرم اصلاح پایین همین کارت است",
        },
        {
          key: "review",
          title: "بررسی دوباره",
          detail: `حداکثر ${slaHours} ساعت بعد از ارسال اصلاح`,
        },
      ];
    default:
      return [];
  }
}

/** 0..1 through the seven-day wait, or null when not waiting on day 7. */
function day7Progress(sub: UserSubmissionJson, now: Date) {
  if (sub.status !== "approved" && sub.status !== "bonus_pending") return null;
  if (sub.day7InsightsOpen || sub.day7ProofSubmittedAt || !sub.day7OpensAt) return null;
  const start = new Date(sub.createdAt).getTime();
  const end = new Date(sub.day7OpensAt).getTime();
  const remainingMs = end - now.getTime();
  if (remainingMs <= 0 || end <= start) return null;
  return {
    remainingMs,
    ratio: Math.min(1, Math.max(0, (now.getTime() - start) / (end - start))),
  };
}

export function SubmissionNextSteps({
  submission,
  compact = false,
  className,
}: {
  submission: UserSubmissionJson;
  /** One line: just the current step and its date. */
  compact?: boolean;
  className?: string;
}) {
  const now = useNow();

  if (compact) {
    const current = stepsFor(submission, now).find((step) => step.now);
    if (!current) return null;
    return (
      <p className={cn("flex items-start gap-1.5 text-[11px] leading-relaxed", className)}>
        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
        <span>
          <span className="font-semibold text-white/80">{current.title}</span>
          <span className="text-white/45"> · {current.detail}</span>
        </span>
      </p>
    );
  }

  if (submission.status === "finalized") {
    const earned = submission.basePayoutToman + submission.bonusToman;
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-xs",
          earned > 0
            ? "border-brand/25 bg-brand/[0.07] text-white/75"
            : "border-white/8 bg-black/20 text-white/55",
          className
        )}
      >
        <p className="flex items-center gap-2">
          {earned > 0 && <Sparkles className="size-3.5 shrink-0 text-brand" />}
          {earned > 0 ? (
            <span>
              <strong className="earn-money text-brand">
                {formatTomanCompact(earned)} تومان
              </strong>{" "}
              به کیف پولت اضافه شد
            </span>
          ) : (
            <span>
              به {formatToman(MIN_PAID_VIEWS)} بازدید نرسید و پاداشی نداشت. ریل
              بعدی را با یکی از پرامپت‌های آماده امتحان کن.
            </span>
          )}
          {submission.finalizedAt && (
            <span className="text-white/35">· {formatDayMonth(submission.finalizedAt)}</span>
          )}
        </p>
        {earned > 0 && (
          <Link
            href="/billing"
            className="inline-flex items-center gap-1 text-brand hover:text-brand-soft"
          >
            کیف پول
            <ArrowUpLeft className="size-3.5" />
          </Link>
        )}
      </div>
    );
  }

  const steps = stepsFor(submission, now);
  if (steps.length === 0) return null;
  const progress = day7Progress(submission, now);

  return (
    <div className={cn("rounded-xl border border-white/8 bg-black/20 p-3", className)}>
      <div className="mb-2 text-[11px] font-semibold text-white/45">بعدش چی می‌شود؟</div>
      <ol className="space-y-2.5">
        {steps.map((step, i) => (
          <li key={step.key} className="flex gap-2.5">
            <span className="flex flex-col items-center">
              <span
                className={cn(
                  "relative mt-1 flex size-2.5 shrink-0 rounded-full",
                  step.now ? "bg-brand" : "border border-white/20 bg-transparent"
                )}
              >
                {step.now && <span className="earn-live absolute inset-0 rounded-full text-brand" />}
              </span>
              {i < steps.length - 1 && <span className="mt-1 w-px flex-1 bg-white/10" />}
            </span>
            <div className="min-w-0 flex-1 pb-0.5">
              <div
                className={cn(
                  "text-sm",
                  step.now ? "font-semibold text-white" : "text-white/50"
                )}
              >
                {step.title}
              </div>
              <div className={cn("mt-0.5 text-xs", step.now ? "text-white/60" : "text-white/35")}>
                {step.detail}
              </div>
              {step.now && progress && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-brand transition-[width] duration-700"
                      style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                    />
                  </div>
                  <div className="earn-money text-[11px] text-brand">
                    {formatRemainingDuration(progress.remainingMs)}
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
