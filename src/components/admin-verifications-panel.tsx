"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, BellRing, Check, X } from "lucide-react";
import { useAdminRefresh } from "@/components/admin-shell";
import {
  AdminEmpty,
  AdminError,
  AdminExternalLink,
  AdminLoading,
  AdminPageHeader,
  AdminPerson,
  AdminPill,
  AdminRefreshButton,
  AdminSegmented,
  AdminSpinnerIcon,
  adminBtn,
  adminCard,
  adminField,
  type PillTone,
} from "@/components/admin-ui";
import { CopyButton } from "@/components/copy-button";
import { ReviewSlaBadge, reviewSlaCardClass } from "@/components/review-sla";
import { formFocus } from "@/lib/brand";
import type { EarnVerificationStatus } from "@/lib/earn";
import { cn, formatDate } from "@/lib/utils";

interface VerificationRow {
  userId: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  handle: string | null;
  code: string | null;
  status: EarnVerificationStatus;
  note: string | null;
  profileUrl: string | null;
  requestedAt: string | null;
  updatedAt: string;
  campaignSmsEligible: boolean;
  campaignSmsOptIn: boolean;
}

const statusMeta: Record<string, { label: string; tone: PillTone }> = {
  pending: { label: "در انتظار", tone: "warn" },
  verified: { label: "تأیید شده", tone: "cash" },
  rejected: { label: "رد شده", tone: "danger" },
  none: { label: "شروع نشده", tone: "neutral" },
};

type StatusFilter = "pending" | "verified" | "rejected" | "all";

export function AdminVerificationsPanel() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const refreshOverview = useAdminRefresh();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/earn/verifications?status=${status}`
      );
      const data = (await res.json()) as {
        verifications?: VerificationRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "بارگذاری صف تأیید ناموفق بود");
        setRows([]);
        return;
      }
      setRows(data.verifications ?? []);
    } catch {
      setError("بارگذاری صف تأیید ناموفق بود");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const setSmsEligible = async (userId: string, eligible: boolean) => {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/earn/creators/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignSmsEligible: eligible }),
      });
      const data = (await res.json()) as {
        campaignSmsEligible?: boolean;
        campaignSmsOptIn?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "ذخیره دسترسی پیامک ناموفق بود");
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.userId === userId
            ? {
                ...row,
                campaignSmsEligible: Boolean(data.campaignSmsEligible),
                campaignSmsOptIn: Boolean(data.campaignSmsOptIn),
              }
            : row
        )
      );
    } catch {
      setError("ذخیره دسترسی پیامک ناموفق بود");
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (
    userId: string,
    decision: "approve" | "reject"
  ) => {
    const note = (notes[userId] || "").trim();
    if (decision === "reject" && note.length < 3) {
      setError("برای رد کردن، دلیل را بنویس.");
      return;
    }
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/earn/verifications/${userId}`, {
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
      refreshOverview();
      await load();
    } catch {
      setError("ثبت تصمیم ناموفق بود");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={BadgeCheck}
        title="تأیید پیج اینستاگرام"
        description="کد را در بیو پیج پیدا کن، بعد تأیید یا رد کن."
        actions={<AdminRefreshButton onClick={() => void load()} loading={loading} />}
        guide={
          <>
            SLA بررسی حداکثر ۴۸ ساعت است. پروفایل را باز کن و مطمئن شو متن کد
            دقیقاً در بیو هست. قدیمی‌ترین درخواست‌ها بالاترند. برای سازنده‌های
            تأییدشده می‌توانی پیامک کمپین جدید را فعال کنی.
          </>
        }
      />

      <AdminSegmented
        value={status}
        onChange={setStatus}
        options={[
          {
            id: "pending",
            label: "در انتظار",
            count: status === "pending" && !loading ? rows.length : undefined,
          },
          { id: "verified", label: "تأیید شده" },
          { id: "rejected", label: "رد شده" },
          { id: "all", label: "همه" },
        ]}
      />

      {error && !loading && rows.length > 0 && <AdminError message={error} />}

      {loading ? (
        <AdminLoading />
      ) : error && rows.length === 0 ? (
        <AdminError message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <AdminEmpty
          icon={BadgeCheck}
          title={status === "pending" ? "درخواست تأییدی در صف نیست" : "موردی در این وضعیت نیست"}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const slaStart = row.requestedAt ?? row.updatedAt;
            const meta = statusMeta[row.status] ?? {
              label: row.status,
              tone: "neutral" as const,
            };
            const busy = busyId === row.userId;
            return (
              <article
                key={row.userId}
                className={cn(
                  adminCard,
                  "overflow-hidden",
                  row.status === "pending" ? reviewSlaCardClass(slaStart) : ""
                )}
              >
                <div className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <AdminPerson
                      firstName={row.firstName}
                      lastName={row.lastName}
                      badge={<AdminPill tone={meta.tone}>{meta.label}</AdminPill>}
                      meta={
                        <span dir="ltr">
                          {row.handle ? `@${row.handle} · ` : ""}
                          {row.mobileNumber}
                        </span>
                      }
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      {row.status === "pending" && (
                        <ReviewSlaBadge startedAt={slaStart} />
                      )}
                      <span className="text-[11px] text-white/35">
                        {formatDate(row.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {(row.code || row.profileUrl) && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-brand/30 bg-brand/[0.04] px-3 py-2.5">
                      {row.code ? (
                        <div className="min-w-0">
                          <div className="text-[11px] text-white/40">
                            کد مورد انتظار در بیو
                          </div>
                          <code
                            className="mt-0.5 block text-left text-base font-bold tracking-wide text-brand"
                            dir="ltr"
                          >
                            {row.code}
                          </code>
                        </div>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-2">
                        {row.code && <CopyButton text={row.code} />}
                        {row.profileUrl && (
                          <AdminExternalLink href={row.profileUrl} primary>
                            باز کردن پروفایل
                          </AdminExternalLink>
                        )}
                      </div>
                    </div>
                  )}

                  {row.note && row.status !== "pending" && (
                    <p className="text-sm text-white/55">یادداشت: {row.note}</p>
                  )}

                  {row.status === "verified" && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs text-white/55">
                        <BellRing className="size-3.5 text-white/40" />
                        پیامک کمپین جدید
                        {row.campaignSmsOptIn && (
                          <AdminPill tone="brand">منتظر کمپین بعدی</AdminPill>
                        )}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={row.campaignSmsEligible}
                        disabled={busy}
                        onClick={() =>
                          void setSmsEligible(row.userId, !row.campaignSmsEligible)
                        }
                        className="inline-flex items-center gap-2 text-xs text-white/60 disabled:opacity-50"
                      >
                        {row.campaignSmsEligible ? "فعال" : "غیرفعال"}
                        <span
                          className={cn(
                            "relative h-5 w-9 rounded-full transition-colors",
                            row.campaignSmsEligible ? "bg-brand" : "bg-white/15"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all",
                              row.campaignSmsEligible
                                ? "left-0.5 bg-brand-ink"
                                : "left-[18px]"
                            )}
                          />
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {row.status === "pending" && (
                  <div className="space-y-2 border-t border-white/6 bg-black/20 px-4 py-3 sm:px-5">
                    <textarea
                      value={notes[row.userId] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [row.userId]: e.target.value,
                        }))
                      }
                      placeholder="یادداشت برای کاربر (برای رد کردن الزامی است)"
                      aria-label="یادداشت برای کاربر"
                      className={cn(adminField, formFocus, "min-h-14")}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void decide(row.userId, "approve")}
                        className={adminBtn.primary}
                      >
                        <AdminSpinnerIcon busy={busy} icon={Check} />
                        تأیید پیج
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void decide(row.userId, "reject")}
                        className={adminBtn.danger}
                      >
                        <X className="size-4" />
                        رد
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
