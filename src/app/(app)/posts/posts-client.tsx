"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ExternalLink,
  Eye,
  History,
  ImagePlus,
  Loader2,
  Send,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import { PlatformBadge } from "@/components/campaign-card";
import { CampaignBudgetMeter } from "@/components/campaign-budget";
import { CampaignRequirements } from "@/components/campaign-requirements";
import { ReviewSlaNotice, ReviewSlaPromise } from "@/components/review-sla";
import { SectionBadge } from "@/components/section-badge";
import {
  SubmissionStatusBadge,
  SubmissionTimeline,
} from "@/components/submission-timeline";
import {
  brandCta,
  brandCtaGhost,
  brandGlassCard,
  brandGlassCardHover,
  formFocus,
  formInput,
  sectionTitle,
} from "@/lib/brand";
import { MAX_IMAGE_SIZE } from "@/lib/image-constants";
import { validateImageFile } from "@/lib/image-validation";
import type { UserCampaignJson, UserSubmissionJson } from "@/lib/earn-submissions-types";
import { normalizeInstagramPostUrl } from "@/lib/validations";
import { cn, formatDate, formatDateTime, formatToman, formatTomanCompact } from "@/lib/utils";
import { REVIEW_SLA_HOURS, reviewDueAt } from "@/lib/earn";

export default function PostsPage() {
  const { status: authStatus } = useSession();
  const searchParams = useSearchParams();
  const highlight = searchParams.get("campaign") ?? "";

  const [loading, setLoading] = useState(authStatus === "authenticated");
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<UserSubmissionJson[]>([]);
  const [campaigns, setCampaigns] = useState<UserCampaignJson[]>([]);
  const [verification, setVerification] = useState<{
    status: string;
    handle: string | null;
  }>({ status: "none", handle: null });

  const [campaignId, setCampaignId] = useState(highlight);
  const [postUrl, setPostUrl] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/earn/submissions");
      const data = (await res.json()) as {
        submissions?: UserSubmissionJson[];
        campaigns?: UserCampaignJson[];
        verification?: { status: string; handle: string | null };
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "بارگذاری ارسال‌ها ناموفق بود");
        return;
      }
      setSubmissions(data.submissions ?? []);
      setCampaigns(data.campaigns ?? []);
      setVerification(data.verification ?? { status: "none", handle: null });
    } catch {
      setError("بارگذاری ارسال‌ها ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [authStatus, load]);

  useEffect(() => {
    return () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    };
  }, [proofPreview]);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === campaignId) || null,
    [campaigns, campaignId]
  );

  const verified = verification.status === "verified";

  const pickFile = (file: File | null) => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofFile(null);
    setProofPreview(null);
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setFormError(validation.error || "فایل نامعتبر است");
      return;
    }
    setFormError(null);
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!verified) {
      setFormError("برای ارسال پست، ابتدا حساب اینستاگرام خود را تأیید کنید.");
      return;
    }
    if (!campaignId) {
      setFormError("کمپین را انتخاب کنید.");
      return;
    }
    if (selectedCampaign && selectedCampaign.remainingSubmissions <= 0) {
      setFormError("به سقف تعداد ارسال این کمپین رسیده‌اید.");
      return;
    }
    const normalizedUrl = normalizeInstagramPostUrl(postUrl);
    if (!normalizedUrl) {
      setFormError(
        "لینک پست اینستاگرام معتبر نیست. از لینک پست، ریلز یا IGTV استفاده کنید."
      );
      return;
    }
    if (!proofFile) {
      setFormError("اسکرین‌شات اثبات را انتخاب کنید.");
      return;
    }

    setSubmitting(true);
    try {
      const uploadData = new FormData();
      uploadData.append("image", proofFile);
      const uploadRes = await fetch("/api/upload/image", {
        method: "POST",
        body: uploadData,
      });
      const uploadJson = (await uploadRes.json()) as {
        url?: string;
        error?: string;
      };
      if (!uploadRes.ok || !uploadJson.url) {
        setFormError(uploadJson.error || "آپلود اسکرین‌شات ناموفق بود");
        return;
      }

      const res = await fetch("/api/user/earn/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          instagramPostUrl: normalizedUrl,
          proofScreenshotUrl: uploadJson.url,
        }),
      });
      const data = (await res.json()) as {
        submission?: UserSubmissionJson;
        error?: string;
      };
      if (!res.ok) {
        setFormError(data.error || "ثبت ارسال ناموفق بود");
        return;
      }
      if (data.submission) {
        setSubmissions((prev) => [data.submission!, ...prev]);
      }
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === campaignId
            ? {
                ...campaign,
                submittedCount: campaign.submittedCount + 1,
                remainingSubmissions: Math.max(
                  0,
                  campaign.remainingSubmissions - 1
                ),
              }
            : campaign
        )
      );
      setPostUrl("");
      pickFile(null);
      setFormSuccess(
        (() => {
          const due = reviewDueAt(new Date());
          return due
            ? `ارسال ثبت شد. بررسی حداکثر ${REVIEW_SLA_HOURS.toLocaleString("fa-IR")} ساعت. نتیجه تا ${formatDateTime(due.toISOString())} اعلام می‌شود.`
            : "ارسال ثبت شد و در صف بررسی قرار گرفت.";
        })()
      );
    } catch {
      setFormError("ثبت ارسال ناموفق بود");
    } finally {
      setSubmitting(false);
    }
  };

  if (authStatus === "loading" || (authStatus === "authenticated" && loading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className={cn(brandGlassCard, "px-6 py-16 text-center")}>
        <h1 className="text-xl font-bold text-white">ورود لازم است</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">
          برای ارسال لینک پست و دیدن وضعیت بررسی، وارد حساب خود شوید.
        </p>
        <Link
          href="/login?callbackUrl=/posts"
          className={cn(brandCta, "mt-5 inline-flex px-5 py-2.5 text-sm")}
        >
          ورود / ثبت‌نام
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionBadge icon={History}>پیگیری پاداش</SectionBadge>
          <h1 className={cn("mt-3", sectionTitle)}>ارسال‌های من</h1>
          <p className="mt-1 max-w-xl text-sm text-white/55">
            لینک ریل و اسکرین‌شات را بفرست، مسیر بررسی و پرداخت را همین‌جا دنبال کن.{" "}
            <Link href="/help/ersal-post" className="text-brand hover:text-brand-soft">
              راهنمای ارسال
            </Link>
          </p>
        </div>
        <ReviewSlaPromise />
      </header>

      <section className={cn(brandGlassCard, "space-y-4 p-5 sm:p-6")}>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-ink">
            <Send className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">ثبت پست جدید</h2>
            <p className="mt-1 text-sm text-white/55">
              کمپین را انتخاب کن، لینک ریل را بگذار و یک اسکرین‌شات از صفحه پست
              بفرست. بعد از ثبت، زمان دقیق اعلام نتیجه را می‌بینی.
            </p>
          </div>
        </div>

        {!verified && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 shrink-0 text-amber-300" />
              <div>
                <div className="text-sm font-semibold text-amber-100">
                  اول پیج اینستاگرامت را تأیید کن
                </div>
                <p className="mt-0.5 text-xs text-amber-100/70">
                  بدون تأیید پیج نمی‌توانی پست ثبت کنی. کمتر از یک دقیقه طول می‌کشد.
                </p>
              </div>
            </div>
            <Link href="/profile" className={cn(brandCta, "px-4 py-2 text-sm")}>
              تأیید پیج
            </Link>
          </div>
        )}

        {campaigns.length === 0 ? (
          <p className="text-sm text-white/45">
            فعلاً کمپین فعالی برای ارسال وجود ندارد.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-white/55">۱. کمپین</span>
              <select
                value={campaignId}
                onChange={(event) => setCampaignId(event.target.value)}
                className={cn(formInput, formFocus)}
              >
                <option value="">انتخاب کمپین</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title} ({formatToman(campaign.remainingSubmissions)} ارسال باقی)
                  </option>
                ))}
              </select>
            </label>

            {selectedCampaign && (
              <div className="space-y-3 rounded-2xl border border-brand/20 bg-brand/[0.05] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-xs text-white/50">درآمد این ریل</div>
                  <div className="earn-money text-xl text-white">
                    {formatTomanCompact(selectedCampaign.basePayoutToman)}
                    <span className="mx-1.5 text-sm font-medium text-white/35">تا</span>
                    <span className="text-brand">
                      {formatTomanCompact(selectedCampaign.maxPayoutPerVideoToman)}
                    </span>
                    <span className="mr-1 text-[11px] font-medium text-white/40">تومان</span>
                  </div>
                </div>
                <p className="text-xs text-white/45">
                  {formatToman(selectedCampaign.remainingSubmissions)} ارسال از{" "}
                  {formatToman(selectedCampaign.maxSubmissionsPerUser)} برایت باقی مانده
                </p>
                <CampaignBudgetMeter
                  spentBudgetToman={selectedCampaign.spentBudgetToman}
                  totalBudgetToman={selectedCampaign.totalBudgetToman}
                  basePayoutToman={selectedCampaign.basePayoutToman}
                  compact
                />
                <CampaignRequirements campaign={selectedCampaign} />
              </div>
            )}

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-white/55">۲. لینک پست اینستاگرام</span>
              <input
                value={postUrl}
                onChange={(event) => setPostUrl(event.target.value)}
                placeholder="https://www.instagram.com/reel/..."
                dir="ltr"
                className={cn(formInput, formFocus, "text-left")}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-white/55">۳. اسکرین‌شات صفحه پست</span>
              <div className="flex flex-wrap items-center gap-3">
                <label
                  className={cn(
                    brandCtaGhost,
                    "cursor-pointer px-4 py-2.5 text-sm"
                  )}
                >
                  <ImagePlus className="size-4" />
                  انتخاب عکس
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) =>
                      pickFile(event.target.files?.[0] ?? null)
                    }
                  />
                </label>
                <span className="text-[11px] text-white/40">
                  JPG، PNG یا WEBP تا {Math.round(MAX_IMAGE_SIZE / (1024 * 1024))} مگابایت
                </span>
              </div>
              {proofPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proofPreview}
                  alt="پیش‌نمایش اسکرین‌شات"
                  className="mt-2 max-h-48 rounded-xl border border-white/10 object-contain"
                />
              )}
            </label>

            {formError && (
              <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {formError}
              </p>
            )}
            {formSuccess && (
              <p className="rounded-xl border border-cash/30 bg-cash/10 px-3 py-2 text-sm text-cash">
                {formSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !verified}
              className={cn(brandCta, "h-12 w-full px-5 text-sm sm:w-auto")}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "در حال ارسال..." : "ثبت و ارسال به بررسی"}
            </button>
          </form>
        )}
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-950/20 px-4 py-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {submissions.length === 0 ? (
        <div className={cn(brandGlassCard, "px-6 py-14 text-center")}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand/12 text-brand">
            <Wand2 className="size-5" />
          </div>
          <h3 className="mt-4 font-bold text-white">هنوز پستی ثبت نکرده‌ای</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-white/50">
            اولین ریلت را با بنانا بساز، منتشر کن و لینکش را از فرم بالا بفرست.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/70">
            {formatToman(submissions.length)} ارسال
          </h2>
          {submissions.map((sub) => {
            const totalPayout = sub.basePayoutToman + sub.bonusToman;
            return (
              <article
                key={sub.id}
                className={cn(brandGlassCard, brandGlassCardHover, "p-4 sm:p-5")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-white">
                    {sub.campaignTitle}
                  </h2>
                  <PlatformBadge platform={sub.platform} />
                  <SubmissionStatusBadge status={sub.status} />
                </div>
                <SubmissionTimeline status={sub.status} className="mt-4 max-w-md" />
                {sub.status === "pending" && (
                  <div className="mt-3">
                    <ReviewSlaNotice startedAt={sub.resubmittedAt ?? sub.createdAt} />
                  </div>
                )}
                {sub.status === "pending" && sub.resubmitCount > 0 && (
                  <p className="mt-2 text-sm text-white/55">
                    اصلاح شما دوباره در صف بررسی است.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/40">
                  <span>{formatDate(sub.createdAt)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="size-3" />
                    {formatToman(sub.views)} بازدید
                  </span>
                </div>
                {(sub.status === "rejected" ||
                  sub.status === "changes_requested") &&
                  sub.reviewerNote && (
                    <p
                      className={cn(
                        "mt-2 rounded-xl px-3 py-2 text-sm",
                        sub.canResubmit
                          ? "border border-orange-500/25 bg-orange-950/20 text-orange-100"
                          : "text-rose-200"
                      )}
                    >
                      {sub.canResubmit ? "برای تأیید باید اصلاح شود: " : "دلیل رد: "}
                      {sub.reviewerNote}
                    </p>
                  )}

                {sub.canResubmit && (
                  <ResubmitForm
                    submission={sub}
                    campaign={
                      campaigns.find((campaign) => campaign.id === sub.campaignId) ??
                      null
                    }
                    onDone={(updated) =>
                      setSubmissions((prev) =>
                        prev.map((row) => (row.id === updated.id ? updated : row))
                      )
                    }
                  />
                )}

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <a
                    href={sub.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-brand hover:text-brand-soft"
                  >
                    مشاهده پست
                    <ExternalLink className="size-3.5" />
                  </a>
                  {sub.proofScreenshotUrl && (
                    <a
                      href={sub.proofScreenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-white/55 hover:text-white"
                    >
                      اسکرین‌شات
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                  <div className="mr-auto flex items-center gap-2 rounded-full border border-white/8 bg-black/25 px-3 py-1.5 text-xs text-white/55">
                    <span>پایه {formatTomanCompact(sub.basePayoutToman)}</span>
                    <span className="text-white/25">+</span>
                    <span>بازدید {formatTomanCompact(sub.bonusToman)}</span>
                    <span className="text-white/25">=</span>
                    <span className="earn-money text-sm text-brand">
                      {formatToman(totalPayout)}
                      <span className="mr-1 text-[10px] font-medium text-brand/70">تومان</span>
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResubmitForm({
  submission,
  campaign,
  onDone,
}: {
  submission: UserSubmissionJson;
  campaign: UserCampaignJson | null;
  onDone: (updated: UserSubmissionJson) => void;
}) {
  const [postUrl, setPostUrl] = useState(submission.postUrl);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (proofPreview) URL.revokeObjectURL(proofPreview);
    };
  }, [proofPreview]);

  const pickFile = (file: File | null) => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofFile(null);
    setProofPreview(null);
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setError(validation.error || "فایل نامعتبر است");
      return;
    }
    setError(null);
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!proofFile) {
      setError("اسکرین‌شات تازه از پست اصلاح‌شده لازم است.");
      return;
    }
    const normalizedUrl = normalizeInstagramPostUrl(postUrl);
    if (!normalizedUrl) {
      setError(
        "لینک پست اینستاگرام معتبر نیست. از لینک پست، ریلز یا IGTV استفاده کنید."
      );
      return;
    }

    setSubmitting(true);
    try {
      let proofScreenshotUrl = submission.proofScreenshotUrl;
      if (proofFile) {
        const uploadData = new FormData();
        uploadData.append("image", proofFile);
        const uploadRes = await fetch("/api/upload/image", {
          method: "POST",
          body: uploadData,
        });
        const uploadJson = (await uploadRes.json()) as {
          url?: string;
          error?: string;
        };
        if (!uploadRes.ok || !uploadJson.url) {
          setError(uploadJson.error || "آپلود اسکرین‌شات ناموفق بود");
          return;
        }
        proofScreenshotUrl = uploadJson.url;
      }

      const res = await fetch(`/api/user/earn/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagramPostUrl: normalizedUrl,
          proofScreenshotUrl,
        }),
      });
      const data = (await res.json()) as {
        submission?: UserSubmissionJson;
        error?: string;
      };
      if (!res.ok || !data.submission) {
        setError(data.error || "ارسال مجدد ناموفق بود");
        return;
      }
      onDone(data.submission);
    } catch {
      setError("ارسال مجدد ناموفق بود");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-3 space-y-3 rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] p-4"
    >
      <p className="text-xs text-white/55">
        فقط یک‌بار می‌توانید این ارسال را اصلاح کنید. همان پست را درست کنید
        (هشتگ، منشن یا کپشن)، اسکرین‌شات تازه بگیرید و دوباره بفرستید. ارسال جدید
        لازم نیست.
      </p>
      {campaign && <CampaignRequirements campaign={campaign} />}
      <label className="block space-y-1.5">
        <span className="text-xs text-white/50">لینک پست اینستاگرام</span>
        <input
          value={postUrl}
          onChange={(event) => setPostUrl(event.target.value)}
          dir="ltr"
          className={cn(formInput, formFocus, "text-left")}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs text-white/50">
          اسکرین‌شات جدید از پست اصلاح‌شده
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={cn(brandCtaGhost, "cursor-pointer px-4 py-2.5 text-sm")}
          >
            <ImagePlus className="size-4" />
            انتخاب عکس
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <span className="text-[11px] text-white/40">
            JPG، PNG یا WEBP تا {Math.round(MAX_IMAGE_SIZE / (1024 * 1024))}{" "}
            مگابایت
          </span>
        </div>
        {(proofPreview || submission.proofScreenshotUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proofPreview || submission.proofScreenshotUrl}
            alt="اسکرین‌شات اثبات"
            className="mt-2 max-h-40 rounded-xl border border-white/10 object-contain"
          />
        )}
      </label>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className={cn(brandCta, "px-4 py-2.5 text-sm disabled:opacity-50")}
      >
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {submitting ? "در حال ارسال..." : "اصلاح و ارسال مجدد"}
      </button>
    </form>
  );
}
