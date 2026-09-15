import {
  Award,
  Check,
  Clock3,
  Hourglass,
  RotateCcw,
  XCircle,
} from "lucide-react";
import type { EarnSubmissionStatus } from "@/lib/earn";
import { cn } from "@/lib/utils";

/**
 * Where a submission sits in the pay flow. The happy path is a four-stop rail;
 * rejected / changes_requested render as a single flagged state so the
 * creator immediately sees what to do.
 */

const RAIL = [
  { key: "pending", label: "در صف بررسی", icon: Hourglass },
  { key: "approved", label: "تأیید و پاداش پایه", icon: Check },
  { key: "bonus_pending", label: "بازدید روز ۷", icon: Clock3 },
  { key: "finalized", label: "نهایی شد", icon: Award },
] as const;

function railIndex(status: EarnSubmissionStatus) {
  switch (status) {
    case "pending":
      return 0;
    case "approved":
      return 1;
    case "bonus_pending":
      return 2;
    case "finalized":
      return 3;
    default:
      return -1;
  }
}

export const submissionStatusLabel: Record<EarnSubmissionStatus, string> = {
  pending: "در انتظار بررسی",
  approved: "تأیید شده",
  bonus_pending: "منتظر بازدید روز ۷",
  changes_requested: "نیاز به اصلاح",
  rejected: "رد شده",
  finalized: "نهایی شده",
};

export const submissionStatusClass: Record<EarnSubmissionStatus, string> = {
  pending: "border-amber-500/25 bg-amber-500/12 text-amber-200",
  approved: "border-cash/30 bg-cash/12 text-cash",
  bonus_pending: "border-sky-500/25 bg-sky-500/12 text-sky-200",
  changes_requested: "border-orange-500/30 bg-orange-500/12 text-orange-200",
  rejected: "border-rose-500/30 bg-rose-500/12 text-rose-200",
  finalized: "border-brand/30 bg-brand/12 text-brand",
};

export function SubmissionStatusBadge({
  status,
  className,
}: {
  status: EarnSubmissionStatus;
  className?: string;
}) {
  const Icon =
    status === "rejected"
      ? XCircle
      : status === "changes_requested"
        ? RotateCcw
        : RAIL[Math.max(0, railIndex(status))].icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        submissionStatusClass[status],
        className
      )}
    >
      <Icon className="size-3" />
      {submissionStatusLabel[status]}
    </span>
  );
}

export function SubmissionTimeline({
  status,
  className,
}: {
  status: EarnSubmissionStatus;
  className?: string;
}) {
  const index = railIndex(status);

  if (index < 0) {
    const fixable = status === "changes_requested";
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
          fixable
            ? "border-orange-500/25 bg-orange-500/10 text-orange-100"
            : "border-rose-500/25 bg-rose-500/10 text-rose-100",
          className
        )}
      >
        {fixable ? (
          <RotateCcw className="size-3.5 shrink-0" />
        ) : (
          <XCircle className="size-3.5 shrink-0" />
        )}
        {fixable
          ? "یک بار فرصت اصلاح همان پست را داری؛ بعد از اصلاح دوباره وارد صف بررسی می‌شود."
          : "این ارسال نهایی رد شده و پاداشی ندارد. سهمیه‌ات در این کمپین آزاد شد."}
      </div>
    );
  }

  return (
    <ol className={cn("flex items-center gap-0", className)} dir="rtl">
      {RAIL.map((stop, i) => {
        const done = i < index;
        const current = i === index;
        const Icon = stop.icon;
        return (
          <li key={stop.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "relative flex size-7 items-center justify-center rounded-full border text-[10px]",
                  done && "border-brand bg-brand text-brand-ink",
                  current &&
                    "border-brand bg-brand/15 text-brand shadow-[0_0_0_4px_rgba(209,254,23,0.12)]",
                  !done && !current && "border-white/12 bg-black/30 text-white/30"
                )}
              >
                {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                {current && i === 0 ? (
                  <span className="earn-live absolute -left-0.5 -top-0.5 size-2 rounded-full text-brand" />
                ) : null}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[10px] leading-none",
                  done || current ? "text-white/80" : "text-white/30",
                  current && "font-semibold text-brand"
                )}
              >
                {stop.label}
              </span>
            </div>
            {i < RAIL.length - 1 && (
              <span
                className={cn(
                  "mx-1.5 mb-5 h-px flex-1 rounded-full",
                  i < index ? "bg-brand" : "bg-white/10"
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
