"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Eye,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { SectionBadge } from "@/components/section-badge";
import { TierChip } from "@/components/tier-chip";
import {
  brandCta,
  brandGlassCard,
  formFocus,
} from "@/lib/brand";
import {
  computeViewBonusToman,
  matchViewBonusTier,
  MIN_PAID_VIEWS,
  sumReachedViewBonusToman,
  viewBonusRemainingCap,
} from "@/lib/earn";
import type { ViewBonusTier } from "@/lib/types";
import { cn, formatDate, formatToman } from "@/lib/utils";

interface Day7Submission {
  id: string;
  status: string;
  instagramPostUrl: string;
  proofScreenshotUrl: string;
  reviewerNote: string | null;
  basePayoutToman: number;
  bonusToman: number;
  day7Views: number | null;
  day7ClaimedViews: number | null;
  day7ProofScreenshotUrl: string | null;
  day7ProofSubmittedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    instagramHandle: string | null;
    mobileNumber: string;
  } | null;
  campaign: {
    id: string;
    title: string;
    viewBonusTiers: ViewBonusTier[];
    maxPayoutPerVideoToman: number;
    spentBudgetToman: number;
    totalBudgetToman: number;
  } | null;
}

type InsightsFilter = "all" | "sent" | "missing";

export function AdminDay7Panel() {
  const [submissions, setSubmissions] = useState<Day7Submission[]>([]);
  const [filter, setFilter] = useState<InsightsFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/earn/submissions?status=day7");
      const data = (await res.json()) as {
        submissions?: Day7Submission[];
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
    void load();
  }, [load]);

  const sentCount = submissions.filter((s) => s.day7ProofSubmittedAt).length;
  const visible = submissions.filter((s) =>
    filter === "all"
      ? true
      : filter === "sent"
        ? Boolean(s.day7ProofSubmittedAt)
        : !s.day7ProofSubmittedAt
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionBadge icon={Eye}>پاداش بازدید</SectionBadge>
          <h2 className="mt-2 text-xl font-bold text-white">بازدید روز هفتم</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            تعداد بازدید را وارد کنید. زیر {formatToman(MIN_PAID_VIEWS)} بازدید
            پرداختی نیست. بالاتر از آن سیستم پاداش همه سطح‌های رسیده‌شده را جمع
            می‌کند و تا سقف هر ویدیو محدود می‌کند، سپس به کیف پول واریز و ارسال
            را نهایی می‌کند. اگر تأیید را اشتباه زده‌اید، قبل از ثبت بازدید
            می‌توانید آن را برگردانید.
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

      {submissions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", `همه (${formatToman(submissions.length)})`],
              ["sent", `اینسایت رسیده (${formatToman(sentCount)})`],
              [
                "missing",
                `بدون اینسایت (${formatToman(submissions.length - sentCount)})`,
              ],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                filter === id
                  ? "bg-brand/15 text-brand"
                  : "bg-white/5 text-white/55 hover:bg-white/8"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

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
          ارسالی در انتظار ثبت بازدید روز ۷ نیست.
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-white/45">
          موردی با این فیلتر نیست.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((sub) => (
            <Day7Card
              key={sub.id}
              submission={sub}
              onFinalized={(id) =>
                setSubmissions((prev) => prev.filter((row) => row.id !== id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Day7Card({
  submission,
  onFinalized,
}: {
  submission: Day7Submission;
  onFinalized: (id: string) => void;
}) {
  const [viewsInput, setViewsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const campaign = submission.campaign;
  const tiers = campaign?.viewBonusTiers ?? [];
  // Only legacy submissions carry a base credited on approval.
  const base = submission.basePayoutToman || 0;
  const maxPayout = campaign?.maxPayoutPerVideoToman ?? base;
  const remainingCap = viewBonusRemainingCap(maxPayout, base);

  const views = useMemo(() => {
    if (viewsInput.trim() === "") return null;
    const n = Number(viewsInput);
    if (!Number.isInteger(n) || n < 0) return null;
    return n;
  }, [viewsInput]);

  const previewBonus =
    views == null
      ? null
      : computeViewBonusToman(views, tiers, maxPayout, base);
  const matchedTier = views == null ? null : matchViewBonusTier(views, tiers);
  const rawBonus =
    views == null ? 0 : sumReachedViewBonusToman(views, tiers);
  const capped = previewBonus != null && rawBonus > remainingCap;

  const claimed = submission.day7ClaimedViews;
  const hasInsights = Boolean(submission.day7ProofSubmittedAt);
  const claimedGap =
    views != null && claimed != null && views !== claimed
      ? Math.abs(views - claimed) / Math.max(claimed, 1)
      : null;

  const submit = async () => {
    if (views == null) {
      setError("تعداد بازدید را وارد کنید");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/earn/submissions/${submission.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "enter_views", views }),
        }
      );
      const data = (await res.json()) as {
        error?: string;
        bonusToman?: number;
      };
      if (!res.ok) {
        setError(data.error || "ثبت بازدید ناموفق بود");
        return;
      }
      const bonus = data.bonusToman ?? 0;
      setDone(
        bonus > 0
          ? `${formatToman(bonus)} تومان به کیف پول واریز شد و ارسال نهایی شد.`
          : "سطح بازدیدی مطابق نبود. ارسال بدون پاداش اضافه نهایی شد."
      );
      window.setTimeout(() => onFinalized(submission.id), 1200);
    } catch {
      setError("ثبت بازدید ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const revoke = async () => {
    setRevoking(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/earn/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "revoke" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "برگشت تأیید ناموفق بود");
        return;
      }
      setDone(
        base > 0
          ? "تأیید لغو شد. پاداش پایه از کیف پول برگشت و ارسال به صف بررسی رفت."
          : "تأیید لغو شد و ارسال به صف بررسی رفت."
      );
      window.setTimeout(() => onFinalized(submission.id), 1200);
    } catch {
      setError("برگشت تأیید ناموفق بود");
    } finally {
      setRevoking(false);
    }
  };

  const creatorName = submission.user
    ? `${submission.user.firstName} ${submission.user.lastName}`.trim()
    : "کاربر";

  return (
    <article className={cn(brandGlassCard, "p-4 sm:p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">
            {campaign?.title || "کمپین"}
          </h3>
          <p className="mt-1 text-sm text-white/55">
            {creatorName}
            {submission.user?.instagramHandle
              ? ` · @${submission.user.instagramHandle}`
              : ""}
          </p>
          <div className="mt-1 text-xs text-white/40">
            ارسال {formatDate(submission.createdAt)}
          </div>
        </div>
        <div className="text-left text-xs text-white/45">
          {base > 0 && <div>پایه قبلی {formatToman(base)} تومان</div>}
          <div>
            سقف باقیمانده {formatToman(remainingCap)} تومان
          </div>
        </div>
      </div>

      {submission.reviewerNote && (
        <p className="mt-3 text-sm text-white/50">
          یادداشت بررسی: {submission.reviewerNote}
        </p>
      )}

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

      {hasInsights ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] p-3">
          <div className="space-y-1">
            <div className="text-[11px] text-white/45">
              اینسایت سازنده · {formatDate(submission.day7ProofSubmittedAt)}
            </div>
            <div className="earn-money text-lg text-white">
              {formatToman(claimed ?? 0)}
              <span className="mr-1 text-xs font-normal text-white/45">
                بازدید اعلامی
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {submission.day7ProofScreenshotUrl && (
                <a
                  href={submission.day7ProofScreenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-brand hover:text-brand-soft"
                >
                  اسکرین‌شات اینسایت
                  <ExternalLink className="size-3.5" />
                </a>
              )}
              {claimed != null && !done && (
                <button
                  type="button"
                  onClick={() => setViewsInput(String(claimed))}
                  className="rounded-full border border-brand/30 px-2.5 py-1 text-[11px] text-brand hover:bg-brand/10"
                >
                  استفاده از این عدد
                </button>
              )}
            </div>
          </div>
          {submission.day7ProofScreenshotUrl && (
            <a
              href={submission.day7ProofScreenshotUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={submission.day7ProofScreenshotUrl}
                alt="اسکرین‌شات اینسایت"
                className="max-h-28 rounded-lg border border-white/10 object-contain"
              />
            </a>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-white/40">
          سازنده هنوز اینسایت روز ۷ را نفرستاده است.
        </p>
      )}

      {tiers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tiers.map((tier, i) => (
            <TierChip
              key={`${tier.minViews}-${tier.bonusToman}`}
              tier={tier}
              index={i}
              tiers={tiers}
            />
          ))}
        </div>
      )}

      {done ? (
        <p className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200">
          {done}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs text-white/45">
              تعداد بازدید روز ۷
            </span>
            <input
              inputMode="numeric"
              value={viewsInput}
              onChange={(e) => setViewsInput(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="مثلا ۳۴۰۰"
              disabled={saving || revoking || confirmRevoke}
              className={cn(
                "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-white/35",
                formFocus
              )}
            />
          </label>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || revoking || confirmRevoke || views == null}
            className={cn(brandCta, "px-4 py-2.5 text-sm disabled:opacity-50")}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "ثبت و واریز پاداش"
            )}
          </button>
        </div>
      )}

      {previewBonus != null && !done && (
        <p className="mt-2 text-xs text-white/50">
          {matchedTier
            ? `تا سطح ${formatToman(matchedTier.minViews)}+ · جمع سطوح`
            : "هیچ سطحی مطابق نیست"}
          {" · "}
          پاداش: {formatToman(previewBonus)} تومان
          {capped ? " (سقف اعمال شد)" : ""}
        </p>
      )}
      {claimedGap != null && !done && (
        <p
          className={cn(
            "mt-1 text-xs",
            claimedGap > 0.1 ? "text-amber-200" : "text-white/45"
          )}
        >
          با عدد اعلامی سازنده ({formatToman(claimed ?? 0)}) فرق دارد. قبل از
          ثبت، اسکرین‌شات را دوباره ببین.
        </p>
      )}

      {!done && (
        <div className="mt-3 space-y-2">
          {confirmRevoke ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-3">
              <p className="text-sm text-amber-100/90">
                {base > 0
                  ? "پاداش پایه از کیف پول کاربر کم می‌شود و ارسال به صف بررسی برمی‌گردد."
                  : "ارسال به صف بررسی برمی‌گردد."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void revoke()}
                  disabled={saving || revoking}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"
                >
                  {revoking ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="size-4" />
                  )}
                  بله، برگردان
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmRevoke(false);
                    setError(null);
                  }}
                  disabled={revoking}
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 disabled:opacity-50"
                >
                  انصراف
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRevoke(true)}
              disabled={saving || revoking}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 px-3 py-2 text-xs text-white/55 hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-100 disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" />
              لغو تأیید
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-rose-300">{error}</p>
      )}
    </article>
  );
}
