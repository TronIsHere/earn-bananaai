"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import {
  REVIEW_SLA_HOURS,
  countReviewSlaOverdue,
  reviewSlaLabel,
  reviewSlaSnapshot,
  type ReviewSlaStart,
  type ReviewSlaTone,
} from "@/lib/earn";
import { cn, formatDateTime, formatRemainingDuration } from "@/lib/utils";

export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function overdueLabel(slaHours: number) {
  return `مهلت ${slaHours.toLocaleString("fa-IR")} ساعته گذشته`;
}

const toneClass: Record<ReviewSlaTone, string> = {
  ok: "border-brand/25 bg-brand/10 text-brand",
  due_soon: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  overdue: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

export function ReviewSlaPromise({
  slaHours = REVIEW_SLA_HOURS,
  className,
}: {
  slaHours?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand",
        className
      )}
    >
      <Clock3 className="size-3" />
      {reviewSlaLabel(slaHours)}
    </span>
  );
}

/** User-facing deadline: a specific time, not a vague "pending". */
export function ReviewSlaNotice({
  startedAt,
  slaHours = REVIEW_SLA_HOURS,
  className,
}: {
  startedAt?: string | null;
  slaHours?: number;
  className?: string;
}) {
  const now = useNow();
  const sla = startedAt ? reviewSlaSnapshot(startedAt, now, slaHours) : null;

  if (!sla) {
    return (
      <p className={cn("text-sm text-white/55", className)}>
        {reviewSlaLabel(slaHours)}. زمان دقیق نتیجه بعد از ثبت مشخص می‌شود.
      </p>
    );
  }

  if (sla.tone === "overdue") {
    return (
      <p className={cn("text-sm text-amber-100/90", className)}>
        {overdueLabel(slaHours)}. در اولویت صف بررسی است.
      </p>
    );
  }

  return (
    <p className={cn("text-sm text-white/60", className)}>
      {reviewSlaLabel(slaHours)}. نتیجه تا{" "}
      <strong className="text-white">{formatDateTime(sla.dueAt)}</strong> اعلام
      می‌شود
      {sla.remainingMs > 0 ? (
        <span className="text-white/40">
          {" "}
          ({formatRemainingDuration(sla.remainingMs)})
        </span>
      ) : null}
      .
    </p>
  );
}

/** Admin queue badge: remaining time or SLA breach. */
export function ReviewSlaBadge({
  startedAt,
  slaHours = REVIEW_SLA_HOURS,
  className,
}: {
  startedAt?: string | null;
  slaHours?: number;
  className?: string;
}) {
  const now = useNow();
  const sla = startedAt ? reviewSlaSnapshot(startedAt, now, slaHours) : null;
  if (!sla) return null;

  const label =
    sla.tone === "overdue"
      ? overdueLabel(slaHours)
      : `${reviewSlaLabel(slaHours)} · ${formatRemainingDuration(sla.remainingMs)}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        toneClass[sla.tone],
        className
      )}
    >
      <Clock3 className="size-3" />
      {label}
    </span>
  );
}

export function reviewSlaCardClass(
  startedAt?: string | null,
  slaHours = REVIEW_SLA_HOURS
) {
  const sla = startedAt
    ? reviewSlaSnapshot(startedAt, new Date(), slaHours)
    : null;
  if (sla?.tone === "overdue") return "border-rose-500/40";
  if (sla?.tone === "due_soon") return "border-amber-500/35";
  return "";
}

export function ReviewSlaQueueBanner({
  startedAts,
}: {
  startedAts: ReviewSlaStart[];
}) {
  const now = useNow();
  const overdue = countReviewSlaOverdue(startedAts, now);
  if (overdue <= 0) {
    return (
      <p className="rounded-xl border border-brand/20 bg-brand/8 px-3 py-2 text-xs text-brand">
        SLA تیم: {reviewSlaLabel()}. نزدیک‌ترین مهلت‌ها بالاترند.
      </p>
    );
  }
  return (
    <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
      {overdue.toLocaleString("fa-IR")} مورد از مهلت بررسی گذشته. اول این‌ها را
      بررسی کنید.
    </p>
  );
}
