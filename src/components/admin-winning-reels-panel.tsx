"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Eye, Star, Trophy } from "lucide-react";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPill,
  AdminRefreshButton,
  AdminSpinnerIcon,
  adminBtn,
  adminCard,
} from "@/components/admin-ui";
import type { AdminSubmissionJson } from "@/lib/earn-submissions-types";
import { cn, formatDate, formatToman, formatTomanCompact } from "@/lib/utils";

/**
 * Paid, finalized reels. Featuring one puts it in its campaign's "winning
 * reels" gallery for creators, with the amount it earned and the creator's
 * first name. Pick reels that show what a good campaign reel looks like.
 */
export function AdminWinningReelsPanel() {
  const [rows, setRows] = useState<AdminSubmissionJson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/earn/submissions?status=winners");
      const data = (await res.json()) as {
        submissions?: AdminSubmissionJson[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "بارگذاری ریل‌ها ناموفق بود");
        setRows([]);
        return;
      }
      setRows(data.submissions ?? []);
    } catch {
      setError("بارگذاری ریل‌ها ناموفق بود");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const featuredCount = rows.filter((row) => row.featuredAt).length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Trophy}
        title="ریل‌های برنده"
        description={
          rows.length > 0
            ? `${formatToman(featuredCount)} ریل در گالری · هر کمپین حداکثر ۶ ریل آخر را نشان می‌دهد`
            : "ریل‌های پولی را برای الهام سازنده‌ها در گالری کمپین بگذار."
        }
        actions={<AdminRefreshButton onClick={() => void load()} loading={loading} />}
        guide="ریل‌هایی را انتخاب کن که نشان می‌دهند یک ریل خوب برای این کمپین چه شکلی است. در گالری فقط نام کوچک سازنده و مبلغی که گرفته دیده می‌شود."
      />

      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <AdminEmpty
          icon={Trophy}
          title="هنوز ریلی پاداش نگرفته"
          hint="بعد از ثبت بازدید روز ۷، ریل‌های پولی اینجا می‌آیند."
        />
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => (
            <WinnerRow
              key={row.id}
              submission={row}
              onChange={(updated) =>
                setRows((prev) =>
                  prev.map((r) => (r.id === updated.id ? updated : r))
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WinnerRow({
  submission,
  onChange,
}: {
  submission: AdminSubmissionJson;
  onChange: (updated: AdminSubmissionJson) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const featured = Boolean(submission.featuredAt);
  const earned = submission.basePayoutToman + submission.bonusToman;
  const creatorName = submission.user
    ? `${submission.user.firstName} ${submission.user.lastName}`.trim()
    : "کاربر";

  const toggle = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/earn/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "feature", featured: !featured }),
      });
      const data = (await res.json()) as {
        submission?: AdminSubmissionJson;
        error?: string;
      };
      if (!res.ok || !data.submission) {
        setError(data.error || "ذخیره ناموفق بود");
        return;
      }
      onChange(data.submission);
    } catch {
      setError("ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article
      className={cn(
        adminCard,
        "flex flex-wrap items-center justify-between gap-3 p-4",
        featured && "border-brand/30 bg-brand/[0.03]"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex shrink-0 flex-col items-center justify-center rounded-xl bg-black/30 px-3 py-2 text-center">
          <span className="earn-money text-lg text-brand">
            {formatTomanCompact(earned)}
          </span>
          <span className="text-[10px] text-white/40">تومان</span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-white">
              {submission.campaign?.title || "کمپین"}
            </h3>
            {featured && (
              <AdminPill tone="brand" icon={Star}>
                در گالری
              </AdminPill>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-white/55">
            {creatorName}
            {submission.user?.instagramHandle ? (
              <>
                {" · "}
                <span dir="ltr">@{submission.user.instagramHandle}</span>
              </>
            ) : null}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/40">
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3" />
              {formatToman(submission.day7Views ?? 0)} بازدید
            </span>
            <span>{formatDate(submission.finalizedAt)}</span>
            <a
              href={submission.instagramPostUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-white/55 hover:text-white"
            >
              مشاهده پست
              <ExternalLink className="size-3" />
            </a>
          </div>
          {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={saving}
        className={featured ? adminBtn.ghost : adminBtn.primary}
      >
        <AdminSpinnerIcon busy={saving} icon={featured ? Check : Star} />
        {featured ? "حذف از گالری" : "نمایش در گالری"}
      </button>
    </article>
  );
}
