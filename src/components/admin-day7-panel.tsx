"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Eye,
  Loader2,
  RefreshCw,
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
  basePaidAt: string | null;
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
    basePayoutToman: number;
    spentBudgetToman: number;
    totalBudgetToman: number;
  } | null;
}

export function AdminDay7Panel() {
  const [submissions, setSubmissions] = useState<Day7Submission[]>([]);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionBadge icon={Eye}>پاداش بازدید</SectionBadge>
          <h2 className="mt-2 text-xl font-bold text-white">بازدید روز هفتم</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            تعداد بازدید را وارد کنید. سیستم پاداش همه سطح‌های رسیده‌شده را جمع
            می‌کند و تا سقف هر ویدیو منهای پایه محدود می‌کند، سپس به کیف پول
            واریز و ارسال را نهایی می‌کند.
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
          ارسالی در انتظار ثبت بازدید روز ۷ نیست.
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
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
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const campaign = submission.campaign;
  const tiers = campaign?.viewBonusTiers ?? [];
  const base = submission.basePayoutToman || campaign?.basePayoutToman || 0;
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

  const daysSinceBase = submission.basePaidAt
    ? Math.floor(
        (Date.now() - new Date(submission.basePaidAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
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
            {daysSinceBase != null && (
              <> · {formatToman(daysSinceBase)} روز از پاداش پایه</>
            )}
          </div>
        </div>
        <div className="text-left text-xs text-white/45">
          پایه {formatToman(base)} تومان
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
              className={cn(
                "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-white/35",
                formFocus
              )}
            />
          </label>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || views == null}
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

      {error && (
        <p className="mt-2 text-sm text-rose-300">{error}</p>
      )}
    </article>
  );
}
