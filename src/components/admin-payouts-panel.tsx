"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Banknote,
  Check,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { SectionBadge } from "@/components/section-badge";
import {
  ReviewSlaBadge,
  ReviewSlaQueueBanner,
  reviewSlaCardClass,
} from "@/components/review-sla";
import { brandCta, brandGlassCard, formFocus } from "@/lib/brand";
import type { EarnPayoutStatus } from "@/lib/earn";
import { cn, formatDate, formatToman } from "@/lib/utils";

interface AdminPayoutRow {
  id: string;
  amount: number;
  bankNote: string;
  status: EarnPayoutStatus;
  adminNote: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    mobileNumber: string;
  } | null;
}

const statusLabel: Record<string, string> = {
  pending: "در انتظار",
  paid: "واریز شد",
  rejected: "رد شده",
};

export function AdminPayoutsPanel() {
  const [status, setStatus] = useState<"pending" | "paid" | "rejected" | "all">(
    "pending"
  );
  const [rows, setRows] = useState<AdminPayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/earn/payouts?status=${status}`);
      const data = (await res.json()) as {
        payouts?: AdminPayoutRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "بارگذاری درخواست‌های واریز ناموفق بود");
        setRows([]);
        return;
      }
      setRows(data.payouts ?? []);
    } catch {
      setError("بارگذاری درخواست‌های واریز ناموفق بود");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: string, decision: "pay" | "reject") => {
    const note = (notes[id] || "").trim();
    if (decision === "reject" && note.length < 3) {
      setError("برای رد کردن، دلیل را بنویس.");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/earn/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          ...(note ? { note } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "ثبت تصمیم ناموفق بود");
        return;
      }
      await load();
    } catch {
      setError("ثبت تصمیم ناموفق بود");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionBadge icon={Banknote}>واریز دستی</SectionBadge>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55 hover:bg-white/5 hover:text-white"
        >
          <RefreshCw className="size-3.5" />
          نوسازی
        </button>
      </div>

      <p className="text-sm text-white/50">
        SLA بررسی حداکثر ۴۸ ساعت است. واریز بانکی در خود سایت انجام نمی‌شود.
        قدیمی‌ترین درخواست‌ها بالاترند.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["pending", "در انتظار"],
            ["paid", "واریز شده"],
            ["rejected", "رد شده"],
            ["all", "همه"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatus(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs transition-colors",
              status === id
                ? "bg-brand/15 text-brand"
                : "bg-white/5 text-white/55 hover:bg-white/8"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-brand" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-white/45">
          موردی در این وضعیت نیست.
        </div>
      ) : (
        <div className="space-y-3">
          {status === "pending" && (
            <ReviewSlaQueueBanner
              startedAts={rows.map((row) => row.createdAt)}
            />
          )}
          {rows.map((row) => (
            <article
              key={row.id}
              className={cn(
                brandGlassCard,
                "space-y-3 p-4",
                row.status === "pending" ? reviewSlaCardClass(row.createdAt) : ""
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">
                      {row.user
                        ? `${row.user.firstName} ${row.user.lastName}`
                        : "کاربر"}
                    </h3>
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/50">
                      {statusLabel[row.status] || row.status}
                    </span>
                    {row.status === "pending" && (
                      <ReviewSlaBadge startedAt={row.createdAt} />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/40" dir="ltr">
                    {row.user?.mobileNumber ?? ""}
                  </p>
                  <p className="mt-1 text-[11px] text-white/35">
                    {formatDate(row.createdAt)}
                  </p>
                </div>
                <div className="text-left text-lg font-bold text-white">
                  {formatToman(row.amount)}
                  <span className="mr-1 text-xs font-normal text-white/40">
                    تومان
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-brand/30 bg-black/20 px-3 py-2">
                <div className="text-[11px] text-white/40">شبا یا کارت</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-white" dir="ltr">
                  {row.bankNote}
                </p>
              </div>

              {row.adminNote && row.status !== "pending" && (
                <p className="text-sm text-white/55">{row.adminNote}</p>
              )}

              {row.status === "pending" && (
                <div className="space-y-2">
                  <textarea
                    value={notes[row.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    placeholder="یادداشت ادمین (برای رد کردن الزامی است)"
                    className={cn(
                      "min-h-16 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white",
                      formFocus
                    )}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void decide(row.id, "pay")}
                      className={cn(brandCta, "px-4 py-2 text-sm disabled:opacity-50")}
                    >
                      {busyId === row.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      واریز شد
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void decide(row.id, "reject")}
                      className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-500/30 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                    >
                      <X className="size-4" />
                      رد
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
