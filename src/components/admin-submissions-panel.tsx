"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Inbox, RotateCcw, X } from "lucide-react";
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
import {
  ReviewSlaBadge,
  reviewSlaCardClass,
  useNow,
} from "@/components/review-sla";
import {
  creatorLevelById,
  creatorMaxPayoutPerVideoToman,
  FIXABLE_REJECT_REASONS,
  MAX_SUBMISSION_RESUBMITS,
  MIN_PAID_VIEWS,
  reviewSlaSnapshot,
} from "@/lib/earn";
import type { AdminSubmissionJson } from "@/lib/earn-submissions-types";
import { formFocus } from "@/lib/brand";
import { cn, formatDate, formatToman } from "@/lib/utils";

type QueueFilter = "all" | "overdue" | "resubmitted";

function slaStart(sub: AdminSubmissionJson) {
  return sub.resubmittedAt ?? sub.createdAt;
}

export function AdminSubmissionsPanel() {
  const [submissions, setSubmissions] = useState<AdminSubmissionJson[]>([]);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshOverview = useAdminRefresh();
  const now = useNow();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/earn/submissions?status=review");
      const data = (await res.json()) as {
        submissions?: AdminSubmissionJson[];
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

  const isOverdue = (sub: AdminSubmissionJson) =>
    reviewSlaSnapshot(slaStart(sub), now, sub.reviewSlaHours)?.tone === "overdue";
  const isResubmitted = (sub: AdminSubmissionJson) =>
    (sub.resubmitCount ?? 0) >= MAX_SUBMISSION_RESUBMITS;

  const overdueCount = submissions.filter(isOverdue).length;
  const resubmittedCount = submissions.filter(isResubmitted).length;
  const visible = submissions.filter((sub) =>
    filter === "overdue"
      ? isOverdue(sub)
      : filter === "resubmitted"
        ? isResubmitted(sub)
        : true
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={Inbox}
        title="بررسی ارسال‌ها"
        description={
          submissions.length > 0
            ? `${formatToman(submissions.length)} ریل در صف · نزدیک‌ترین مهلت بالاتر است`
            : "ریل‌های ارسالی سازنده‌ها برای تأیید"
        }
        actions={<AdminRefreshButton onClick={() => void load()} loading={loading} />}
        guide={
          <>
            SLA بررسی حداکثر ۴۸ ساعت است و سازنده‌های حرفه‌ای و ستاره ۲۴ ساعته
            بررسی می‌شوند. برای ایراد قابل اصلاح (مثل هشتگ جا مانده) رد با
            امکان یک‌بار ارسال مجدد بزنید تا سازنده کارش را از دست ندهد. اگر
            تأیید را اشتباه زدید، همان کارت یا بخش بازدید روز ۷ دکمه برگشت تأیید
            دارد.
          </>
        }
      />

      {submissions.length > 0 && (
        <AdminSegmented
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "همه", count: submissions.length },
            { id: "overdue", label: "از مهلت گذشته", count: overdueCount },
            { id: "resubmitted", label: "ارسال مجدد", count: resubmittedCount },
          ]}
        />
      )}

      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError message={error} onRetry={() => void load()} />
      ) : submissions.length === 0 ? (
        <AdminEmpty
          icon={Inbox}
          title="صف بررسی خالی است"
          hint="ریل‌های جدید که سازنده‌ها بفرستند اینجا می‌آیند."
        />
      ) : visible.length === 0 ? (
        <AdminEmpty icon={Inbox} title="موردی با این فیلتر نیست" />
      ) : (
        <div className="space-y-3">
          {visible.map((sub) => (
            <ReviewCard
              key={sub.id}
              submission={sub}
              onDone={(id) => {
                setSubmissions((prev) => prev.filter((row) => row.id !== id));
                refreshOverview();
              }}
              onChanged={refreshOverview}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  submission,
  onDone,
  onChanged,
}: {
  submission: AdminSubmissionJson;
  onDone: (id: string) => void;
  onChanged: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const alreadyResubmitted =
    (submission.resubmitCount ?? 0) >= MAX_SUBMISSION_RESUBMITS;
  const [allowResubmit, setAllowResubmit] = useState(!alreadyResubmitted);
  const [saving, setSaving] = useState<"approve" | "reject" | "revoke" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState(false);
  const [revokedNotice, setRevokedNotice] = useState<string | null>(null);

  const maxPayout = submission.campaign
    ? creatorMaxPayoutPerVideoToman(
        submission.campaign.maxPayoutPerVideoToman,
        creatorLevelById(submission.user?.creatorLevel)
      )
    : null;
  const willAllowResubmit = allowResubmit && !alreadyResubmitted;

  const review = async (decision: "approve" | "reject" | "revoke") => {
    if (decision === "reject" && reason.trim().length < 3) {
      setError("دلیل رد کردن را بنویسید");
      return;
    }
    setSaving(decision);
    setError(null);
    if (decision !== "revoke") setRevokedNotice(null);
    try {
      const res = await fetch(`/api/admin/earn/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          decision === "approve"
            ? { decision: "approve" }
            : decision === "revoke"
              ? { decision: "revoke" }
              : {
                  decision: "reject",
                  reason: reason.trim(),
                  allowResubmit: willAllowResubmit,
                }
        ),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "بررسی ناموفق بود");
        return;
      }
      onChanged();
      if (decision === "revoke") {
        setJustApproved(false);
        setDone(null);
        setRejecting(false);
        setRevokedNotice("تأیید لغو شد و ارسال به صف بررسی برگشت.");
        return;
      }
      setDone(
        decision === "approve"
          ? `تأیید شد. پرداخت بعد از ثبت بازدید روز هفتم و از ${formatToman(MIN_PAID_VIEWS)} بازدید به بالا.`
          : willAllowResubmit
            ? "رد شد؛ سازنده یک‌بار می‌تواند اصلاح کند."
            : "ارسال رد شد."
      );
      if (decision === "approve") {
        setJustApproved(true);
        return;
      }
      window.setTimeout(() => onDone(submission.id), 1000);
    } catch {
      setError("بررسی ناموفق بود");
    } finally {
      setSaving(null);
    }
  };

  return (
    <article
      className={cn(
        adminCard,
        "overflow-hidden",
        reviewSlaCardClass(slaStart(submission), submission.reviewSlaHours),
        done && "opacity-80"
      )}
    >
      <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_200px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-white">
              {submission.campaign?.title || "کمپین"}
            </h3>
            {alreadyResubmitted && (
              <AdminPill tone="warn" icon={RotateCcw}>
                ارسال مجدد
              </AdminPill>
            )}
            <ReviewSlaBadge
              startedAt={slaStart(submission)}
              slaHours={submission.reviewSlaHours}
            />
          </div>

          <AdminPerson
            firstName={submission.user?.firstName}
            lastName={submission.user?.lastName}
            badge={
              submission.user && (
                <CreatorLevelChip level={submission.user.creatorLevel} />
              )
            }
            meta={
              <span dir="ltr">
                {submission.user?.instagramHandle
                  ? `@${submission.user.instagramHandle}`
                  : ""}
                {submission.user?.mobileNumber
                  ? ` · ${submission.user.mobileNumber}`
                  : ""}
              </span>
            }
          />

          <div className="flex flex-wrap gap-2">
            <AdminExternalLink href={submission.instagramPostUrl} primary>
              مشاهده پست
            </AdminExternalLink>
            {submission.proofScreenshotUrl && (
              <AdminExternalLink href={submission.proofScreenshotUrl}>
                اسکرین‌شات کامل
              </AdminExternalLink>
            )}
          </div>

          {submission.reviewerNote && (
            <AdminNotice tone="warn">
              {alreadyResubmitted ? "درخواست اصلاح قبلی: " : ""}
              {submission.reviewerNote}
            </AdminNotice>
          )}
        </div>

        <aside className="flex flex-row gap-3 md:flex-col">
          {submission.proofScreenshotUrl && (
            <a
              href={submission.proofScreenshotUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-28 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 md:w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={submission.proofScreenshotUrl}
                alt="اسکرین‌شات اثبات"
                className="max-h-56 w-full object-contain"
              />
            </a>
          )}
          <div className="grid flex-1 grid-cols-1 gap-2 rounded-xl border border-white/6 bg-black/20 p-3">
            {maxPayout != null && (
              <AdminStat
                label="سقف هر ویدیو"
                value={`${formatToman(maxPayout)} تومان`}
                tone="brand"
              />
            )}
            <AdminStat
              label="زمان ارسال"
              value={formatDate(submission.createdAt)}
              tone="muted"
            />
          </div>
        </aside>
      </div>

      <div className="space-y-3 border-t border-white/6 bg-black/20 px-4 py-3 sm:px-5">
        {revokedNotice && !justApproved && !done && (
          <AdminNotice>{revokedNotice}</AdminNotice>
        )}

        {done ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AdminNotice>{done}</AdminNotice>
            {justApproved && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void review("revoke")}
                  disabled={saving !== null}
                  className={adminBtn.warn}
                >
                  <AdminSpinnerIcon busy={saving === "revoke"} icon={RotateCcw} />
                  برگشت تأیید
                </button>
                <button
                  type="button"
                  onClick={() => onDone(submission.id)}
                  disabled={saving !== null}
                  className={adminBtn.ghost}
                >
                  بستن
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {rejecting && (
              <div className="space-y-3">
                <div>
                  <div className="mb-1.5 text-xs text-white/45">دلیل‌های آماده</div>
                  <div className="flex flex-wrap gap-1.5">
                    {FIXABLE_REJECT_REASONS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setReason(preset)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-[11px] transition-colors",
                          reason === preset
                            ? "border-brand/40 bg-brand/15 text-brand"
                            : "border-white/10 text-white/55 hover:border-white/20 hover:text-white"
                        )}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="دلیل رد، مثلا هشتگ الزامی رعایت نشده"
                  aria-label="دلیل رد"
                  className={cn(adminField, formFocus, "min-h-20")}
                />
                {alreadyResubmitted ? (
                  <p className="text-xs text-white/45">
                    این ارسال یک‌بار اصلاح شده؛ رد بعدی نهایی است.
                  </p>
                ) : (
                  <label className="flex items-start gap-2 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={allowResubmit}
                      onChange={(event) => setAllowResubmit(event.target.checked)}
                      className="mt-0.5 size-4 rounded border-white/20 bg-black/30 accent-brand"
                    />
                    <span>
                      اجازه یک‌بار ارسال مجدد (ایراد قابل اصلاح مثل هشتگ جا مانده)
                    </span>
                  </label>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {rejecting ? (
                <>
                  <button
                    type="button"
                    onClick={() => void review("reject")}
                    disabled={saving !== null}
                    className={adminBtn.danger}
                  >
                    <AdminSpinnerIcon busy={saving === "reject"} icon={X} />
                    {willAllowResubmit ? "رد با امکان اصلاح" : "رد نهایی"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejecting(false);
                      setError(null);
                    }}
                    className={adminBtn.ghost}
                  >
                    انصراف
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void review("approve")}
                    disabled={saving !== null}
                    className={adminBtn.primary}
                  >
                    <AdminSpinnerIcon busy={saving === "approve"} icon={Check} />
                    تأیید پست
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejecting(true)}
                    className={adminBtn.danger}
                  >
                    <X className="size-4" />
                    رد کردن
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {error && <p className="text-sm text-rose-300">{error}</p>}
      </div>
    </article>
  );
}
