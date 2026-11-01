"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Eye, RotateCcw } from "lucide-react";
import { useAdminRefresh } from "@/components/admin-shell";
import {
  AdminEmpty,
  AdminError,
  AdminExternalLink,
  AdminLoading,
  AdminNotice,
  AdminPageHeader,
  AdminPerson,
  AdminPill,
  AdminRefreshButton,
  AdminSegmented,
  AdminSpinnerIcon,
  AdminStat,
  adminBtn,
  adminCard,
  adminField,
} from "@/components/admin-ui";
import { CreatorLevelChip } from "@/components/creator-level";
import { TierChip } from "@/components/tier-chip";
import { formFocus } from "@/lib/brand";
import {
  computeViewBonusToman,
  creatorLevelById,
  creatorMaxPayoutPerVideoToman,
  creatorViewBonusTiers,
  matchViewBonusTier,
  type CreatorLevelId,
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
    creatorLevel: CreatorLevelId;
    paidReels: number;
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
  const refreshOverview = useAdminRefresh();

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
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
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
    <div className="space-y-5">
      <AdminPageHeader
        icon={Eye}
        title="بازدید روز هفتم"
        description="بازدید واقعی را ثبت کن تا پاداش به کیف پول سازنده برود."
        actions={<AdminRefreshButton onClick={() => void load()} loading={loading} />}
        guide={
          <>
            زیر {formatToman(MIN_PAID_VIEWS)} بازدید پرداختی نیست. بالاتر از آن
            سیستم پاداش همه سطح‌های رسیده‌شده را جمع می‌کند و تا سقف هر ویدیو
            محدود می‌کند، سپس به کیف پول واریز و ارسال را نهایی می‌کند. اگر
            تأیید را اشتباه زده‌اید، قبل از ثبت بازدید می‌توانید آن را برگردانید.
          </>
        }
      />

      {submissions.length > 0 && (
        <AdminSegmented
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "همه", count: submissions.length },
            { id: "sent", label: "اینسایت رسیده", count: sentCount },
            {
              id: "missing",
              label: "بدون اینسایت",
              count: submissions.length - sentCount,
            },
          ]}
        />
      )}

      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError message={error} onRetry={() => void load()} />
      ) : submissions.length === 0 ? (
        <AdminEmpty
          icon={Eye}
          title="ارسالی منتظر ثبت بازدید نیست"
          hint="ریل‌های تأییدشده بعد از هفت روز اینجا می‌آیند."
        />
      ) : visible.length === 0 ? (
        <AdminEmpty icon={Eye} title="موردی با این فیلتر نیست" />
      ) : (
        <div className="space-y-3">
          {visible.map((sub) => (
            <Day7Card
              key={sub.id}
              submission={sub}
              onFinalized={(id) => {
                setSubmissions((prev) => prev.filter((row) => row.id !== id));
                refreshOverview();
              }}
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
  // Same stages and cap the server applies: both raised by the creator level boost.
  const level = creatorLevelById(submission.user?.creatorLevel);
  const tiers = creatorViewBonusTiers(campaign?.viewBonusTiers ?? [], level);
  // Only legacy submissions carry a base credited on approval.
  const base = submission.basePayoutToman || 0;
  const maxPayout = campaign
    ? creatorMaxPayoutPerVideoToman(campaign.maxPayoutPerVideoToman, level)
    : base;
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

  const busy = saving || revoking || confirmRevoke;

  return (
    <article
      className={cn(
        adminCard,
        "overflow-hidden",
        hasInsights && !done && "border-brand/25",
        done && "opacity-80"
      )}
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white">{campaign?.title || "کمپین"}</h3>
              {hasInsights ? (
                <AdminPill tone="brand">اینسایت رسیده</AdminPill>
              ) : (
                <AdminPill>منتظر اینسایت سازنده</AdminPill>
              )}
            </div>
            <AdminPerson
              firstName={submission.user?.firstName}
              lastName={submission.user?.lastName}
              badge={submission.user && <CreatorLevelChip level={level.id} />}
              meta={
                <>
                  {submission.user?.instagramHandle && (
                    <>
                      <span dir="ltr">@{submission.user.instagramHandle}</span>
                      {" · "}
                    </>
                  )}
                  ارسال {formatDate(submission.createdAt)}
                </>
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2 rounded-xl border border-white/6 bg-black/20 px-3 py-2.5 text-left">
            <AdminStat
              label="سقف باقیمانده"
              value={`${formatToman(remainingCap)} تومان`}
              tone="brand"
            />
            {base > 0 ? (
              <AdminStat label="پایه قبلی" value={`${formatToman(base)} تومان`} />
            ) : level.payoutBoostPercent > 0 ? (
              <AdminStat
                label={`بوست سطح ${level.label}`}
                value={`+${formatToman(level.payoutBoostPercent)}٪`}
              />
            ) : (
              <span />
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <AdminExternalLink href={submission.instagramPostUrl} primary>
            مشاهده پست
          </AdminExternalLink>
          {submission.proofScreenshotUrl && (
            <AdminExternalLink href={submission.proofScreenshotUrl}>
              اسکرین‌شات ارسال
            </AdminExternalLink>
          )}
        </div>

        {submission.reviewerNote && (
          <p className="text-sm text-white/50">
            یادداشت بررسی: {submission.reviewerNote}
          </p>
        )}

        {hasInsights && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] p-3">
            <div className="space-y-1.5">
              <div className="text-[11px] text-white/45">
                اینسایت سازنده · {formatDate(submission.day7ProofSubmittedAt)}
              </div>
              <div className="earn-money text-2xl text-white">
                {formatToman(claimed ?? 0)}
                <span className="mr-1 text-xs font-normal text-white/45">
                  بازدید اعلامی
                </span>
              </div>
              {claimed != null && !done && (
                <button
                  type="button"
                  onClick={() => setViewsInput(String(claimed))}
                  className="rounded-lg border border-brand/30 px-2.5 py-1 text-[11px] font-medium text-brand hover:bg-brand/10"
                >
                  استفاده از این عدد
                </button>
              )}
            </div>
            {submission.day7ProofScreenshotUrl && (
              <a
                href={submission.day7ProofScreenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0"
                title="اسکرین‌شات اینسایت"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={submission.day7ProofScreenshotUrl}
                  alt="اسکرین‌شات اینسایت"
                  className="max-h-32 rounded-lg border border-white/10 object-contain"
                />
              </a>
            )}
          </div>
        )}

        {tiers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
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
      </div>

      <div className="space-y-2 border-t border-white/6 bg-black/20 px-4 py-3 sm:px-5">
        {done ? (
          <AdminNotice>{done}</AdminNotice>
        ) : confirmRevoke ? (
          <div className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-3">
            <p className="text-sm text-amber-100/90">
              {base > 0
                ? "پاداش پایه از کیف پول کاربر کم می‌شود و ارسال به صف بررسی برمی‌گردد."
                : "ارسال به صف بررسی برمی‌گردد."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void revoke()}
                disabled={saving || revoking}
                className={adminBtn.warn}
              >
                <AdminSpinnerIcon busy={revoking} icon={RotateCcw} />
                بله، برگردان
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmRevoke(false);
                  setError(null);
                }}
                disabled={revoking}
                className={adminBtn.ghost}
              >
                انصراف
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block min-w-40 flex-1">
                <span className="mb-1.5 block text-xs text-white/45">
                  تعداد بازدید روز ۷
                </span>
                <input
                  inputMode="numeric"
                  value={viewsInput}
                  onChange={(e) =>
                    setViewsInput(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="مثلا ۳۴۰۰"
                  disabled={busy}
                  className={cn(adminField, formFocus, "tabular-nums")}
                />
              </label>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={busy || views == null}
                className={cn(adminBtn.primary, "py-2.5")}
              >
                <AdminSpinnerIcon busy={saving} icon={Check} />
                ثبت و واریز پاداش
              </button>
              <button
                type="button"
                onClick={() => setConfirmRevoke(true)}
                disabled={saving || revoking}
                className={cn(adminBtn.ghost, "py-2.5 hover:border-amber-500/30 hover:text-amber-100")}
              >
                <RotateCcw className="size-4" />
                لغو تأیید
              </button>
            </div>

            {previewBonus != null && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/55">
                <span>
                  {matchedTier
                    ? `تا سطح ${formatToman(matchedTier.minViews)}+ · جمع سطوح`
                    : "هیچ سطحی مطابق نیست"}
                  {capped ? " · سقف اعمال شد" : ""}
                </span>
                <span className="earn-money text-base text-brand">
                  {formatToman(previewBonus)}
                  <span className="mr-1 text-[11px] font-normal text-white/45">
                    تومان پاداش
                  </span>
                </span>
              </div>
            )}
            {claimedGap != null && (
              <p
                className={cn(
                  "text-xs",
                  claimedGap > 0.1 ? "text-amber-200" : "text-white/45"
                )}
              >
                با عدد اعلامی سازنده ({formatToman(claimed ?? 0)}) فرق دارد. قبل از
                ثبت، اسکرین‌شات را دوباره ببین.
              </p>
            )}
          </>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    </article>
  );
}
