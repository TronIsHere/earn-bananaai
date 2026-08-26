"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import {
  REVIEW_SLA_LABEL,
  countReviewSlaOverdue,
  reviewSlaSnapshot,
  type ReviewSlaTone,
} from "@/lib/earn";
import { cn, formatDateTime, formatRemainingDuration } from "@/lib/utils";

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const toneClass: Record<ReviewSlaTone, string> = {
  ok: "border-brand/25 bg-brand/10 text-brand",
  due_soon: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  overdue: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

export function ReviewSlaPromise({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand",
        className
      )}
    >
      <Clock3 className="size-3" />
      {REVIEW_SLA_LABEL}
    </span>
  );
}

/** User-facing deadline: a specific time, not a vague "pending". */
export function ReviewSlaNotice({
  startedAt,
  className,
}: {
  startedAt?: string | null;
  className?: string;
}) {
  const now = useNow();
  const sla = startedAt ? reviewSlaSnapshot(startedAt, now) : null;

  if (!sla) {
    return (
      <p className={cn("text-sm text-white/55", className)}>
        {REVIEW_SLA_LABEL}. زمان دقیق نتیجه بعد از ثبت مشخص می‌شود.
      </p>
    );
  }

  if (sla.tone === "overdue") {
    return (
      <p className={cn("text-sm text-amber-100/90", className)}>
        مهلت ۴۸ ساعته گذشته. در اولویت صف بررسی است.
      </p>
    );
  }

  return (
    <p className={cn("text-sm text-white/60", className)}>
      {REVIEW_SLA_LABEL}. نتیجه تا{" "}
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
  className,
}: {
  startedAt?: string | null;
  className?: string;
}) {
  const now = useNow();
  const sla = startedAt ? reviewSlaSnapshot(startedAt, now) : null;
  if (!sla) return null;

  const label =
    sla.tone === "overdue"
      ? "مهلت ۴۸ ساعته گذشته"
      : `${REVIEW_SLA_LABEL} · ${formatRemainingDuration(sla.remainingMs)}`;

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

export function reviewSlaCardClass(startedAt?: string | null) {
  const sla = startedAt ? reviewSlaSnapshot(startedAt) : null;
  if (sla?.tone === "overdue") return "border-rose-500/40";
  if (sla?.tone === "due_soon") return "border-amber-500/35";
  return "";
}

export function ReviewSlaQueueBanner({
  startedAts,
}: {
  startedAts: Array<string | null | undefined>;
}) {
  const now = useNow();
  const overdue = countReviewSlaOverdue(startedAts, now);
  if (overdue <= 0) {
    return (
      <p className="rounded-xl border border-brand/20 bg-brand/8 px-3 py-2 text-xs text-brand">
        SLA تیم: {REVIEW_SLA_LABEL}. قدیمی‌ترین درخواست‌ها بالاترند.
      </p>
    );
  }
  return (
    <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
      {overdue.toLocaleString("fa-IR")} مورد از مهلت ۴۸ ساعته گذشته. اول این‌ها
      را بررسی کنید.
    </p>
  );
}
