"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  Banknote,
  CheckCircle2,
  Hourglass,
  Landmark,
  Loader2,
  Wallet,
  XCircle,
} from "lucide-react";
import { Money } from "@/components/money";
import { ProgressBar } from "@/components/progress-bar";
import { SectionBadge } from "@/components/section-badge";
import { useStore } from "@/components/store-provider";
import {
  brandCta,
  brandCtaGlow,
  brandGlassCard,
  brandMeshPanel,
  formFocus,
  formInput,
  sectionTitle,
} from "@/lib/brand";
import { MIN_PAYOUT_TOMAN } from "@/lib/earn";
import type { Wallet as WalletState } from "@/lib/types";
import { cn, formatDate, formatToman, formatTomanCompact } from "@/lib/utils";
import { ReviewSlaNotice, ReviewSlaPromise } from "@/components/review-sla";

interface PayoutRow {
  id: string;
  amount: number;
  bankNote: string;
  status: "pending" | "paid" | "rejected";
  adminNote: string | null;
  paidAt: string | null;
  createdAt: string;
}

const statusLabel: Record<string, string> = {
  paid: "واریز شد",
  pending: "در انتظار بررسی",
  rejected: "رد شده",
};

const statusClass: Record<string, string> = {
  paid: "border-cash/30 bg-cash/12 text-cash",
  pending: "border-amber-500/25 bg-amber-500/12 text-amber-200",
  rejected: "border-rose-500/30 bg-rose-500/12 text-rose-200",
};

const statusIcon: Record<string, typeof Banknote> = {
  paid: CheckCircle2,
  pending: Hourglass,
  rejected: XCircle,
};

export default function BillingPage() {
  const { ready, state, updateWallet } = useStore();
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankNote, setBankNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/earn/payout-request");
      const data = (await res.json()) as {
        payouts?: PayoutRow[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "بارگذاری درخواست‌ها ناموفق بود");
        setPayouts([]);
        return;
      }
      setPayouts(data.payouts ?? []);
    } catch {
      setError("بارگذاری درخواست‌ها ناموفق بود");
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  const pending = useMemo(
    () => payouts.find((row) => row.status === "pending") ?? null,
    [payouts]
  );
  const available = state.wallet.available;
  const canPayout = available >= MIN_PAYOUT_TOMAN && !pending;
  const toMin = Math.max(0, MIN_PAYOUT_TOMAN - available);
  const pct = Math.min(100, (available / MIN_PAYOUT_TOMAN) * 100);

  const openForm = () => {
    setError(null);
    setSuccess(null);
    setAmount(String(available));
    setFormOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/user/earn/payout-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          bankNote,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        wallet?: WalletState;
        payout?: PayoutRow;
      };
      if (!res.ok) {
        setError(data.error || "ثبت درخواست ناموفق بود");
        return;
      }
      if (data.wallet) updateWallet(data.wallet);
      if (data.payout) {
        setPayouts((prev) => [data.payout as PayoutRow, ...prev]);
      } else {
        await load();
      }
      setSuccess(data.message || "درخواست واریز ثبت شد.");
      setFormOpen(false);
      setBankNote("");
    } catch {
      setError("ثبت درخواست ناموفق بود");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <SectionBadge icon={Wallet}>کیف پول</SectionBadge>
        <h1 className={cn("mt-3", sectionTitle)}>کیف پول و واریز</h1>
        <p className="mt-1 text-sm text-white/55">
          موجودی نقدی‌ات و درخواست واریز به شبا یا کارت.{" "}
          <Link href="/help/bardasht" className="text-brand hover:text-brand-soft">
            راهنمای برداشت
          </Link>
        </p>
      </header>

      <section className={cn(brandMeshPanel, "p-6 sm:p-8")}>
        <div className="earn-grid pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="earn-blob pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-brand/15 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/60">
            <Wallet className="size-4 text-brand" />
            قابل برداشت همین حالا
          </div>
          <div>
            <Money amount={available} size="hero" />
          </div>

          {toMin > 0 ? (
            <div className="max-w-md space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/55">
                  <strong className="text-white">{formatTomanCompact(toMin)} تومان</strong>{" "}
                  تا اولین برداشت
                </span>
                <span className="text-white/35">حداقل {formatTomanCompact(MIN_PAYOUT_TOMAN)}</span>
              </div>
              <ProgressBar value={pct} trackClassName="bg-white/8" />
              <p className="pt-1 text-xs text-white/40">
                معمولاً با یک ریل تأییدشده به حداقل برداشت می‌رسی.
              </p>
            </div>
          ) : (
            <p className="text-sm text-cash">
              به حداقل برداشت رسیدی. شبا یا کارتت را ثبت کن تا واریز کنیم.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              disabled={!canPayout}
              onClick={openForm}
              className={cn(brandCtaGlow, "px-6 py-3 text-sm")}
            >
              <Landmark className="size-4" />
              درخواست واریز
            </button>
            <ReviewSlaPromise />
          </div>
        </div>
      </section>

      {pending && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-4">
          <Hourglass className="mt-0.5 size-5 shrink-0 text-amber-300" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-100">
              درخواست {formatToman(pending.amount)} تومانی در حال بررسی است
            </p>
            <p className="text-xs text-amber-100/70">
              تا تعیین وضعیت این درخواست نمی‌توانی درخواست جدید بدهی.
            </p>
            <ReviewSlaNotice startedAt={pending.createdAt} />
          </div>
        </div>
      )}

      {formOpen && (
        <section className={cn(brandGlassCard, "space-y-4 border-brand/30 p-5 sm:p-6")}>
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-ink">
              <Landmark className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">اطلاعات واریز</h2>
              <p className="mt-1 text-sm text-white/50">
                مبلغ و شماره شبا یا کارت را وارد کن. بعد از ثبت، زمان دقیق نتیجه
                را می‌بینی.
              </p>
            </div>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-white/55">مبلغ (تومان)</span>
            <div className="relative">
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                className={cn(formInput, formFocus, "earn-money h-12 text-lg")}
                dir="ltr"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-white/40">
                {amount ? formatToman(Number(amount)) : ""} تومان
              </span>
            </div>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-white/55">
              شبا یا شماره کارت و نام صاحب حساب
            </span>
            <textarea
              value={bankNote}
              onChange={(e) => setBankNote(e.target.value)}
              placeholder="مثال: IR120170000000123456789012 به نام نام و نام خانوادگی"
              className={cn(formInput, formFocus, "min-h-24")}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className={cn(brandCta, "h-12 px-6 text-sm")}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              ثبت درخواست واریز
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="h-12 rounded-2xl border border-white/10 px-4 text-sm text-white/60 transition-colors hover:bg-white/5"
            >
              انصراف
            </button>
          </div>
        </section>
      )}

      {error && (
        <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-cash/30 bg-cash/10 px-3 py-2 text-sm text-cash">
          {success}
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className={cn(brandGlassCard, "flex items-center gap-3 p-4")}>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
            <Banknote className="size-5" />
          </div>
          <div>
            <dt className="text-xs text-white/45">مجموع درآمد تا امروز</dt>
            <dd className="mt-0.5">
              <Money amount={state.wallet.lifetimeEarned} size="md" />
            </dd>
          </div>
        </div>
        <div className={cn(brandGlassCard, "flex items-center gap-3 p-4")}>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cash/12 text-cash">
            <Landmark className="size-5" />
          </div>
          <div>
            <dt className="text-xs text-white/45">واریز شده به حسابت</dt>
            <dd className="mt-0.5">
              <Money amount={state.wallet.lifetimePaidOut} size="md" />
            </dd>
          </div>
        </div>
      </dl>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-white">درخواست‌های واریز</h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : payouts.length === 0 ? (
          <div className={cn(brandGlassCard, "px-6 py-12 text-center")}>
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand/12 text-brand">
              <ArrowDownLeft className="size-5" />
            </div>
            <h3 className="mt-4 font-bold text-white">هنوز درخواست واریزی نداری</h3>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-white/50">
              وقتی موجودی‌ات به {formatTomanCompact(MIN_PAYOUT_TOMAN)} تومان برسد، دکمه
              درخواست واریز فعال می‌شود.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {payouts.map((row) => {
              const Icon = statusIcon[row.status] ?? ArrowDownLeft;
              return (
                <div
                  key={row.id}
                  className={cn(
                    brandGlassCard,
                    "flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                        statusClass[row.status]
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        واریز به شبا / کارت
                      </div>
                      <div className="mt-0.5 text-xs text-white/40">
                        {formatDate(row.createdAt)}
                        {row.paidAt ? ` · واریز ${formatDate(row.paidAt)}` : ""}
                      </div>
                      {row.adminNote ? (
                        <div className="mt-1 text-xs text-white/55">{row.adminNote}</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-left">
                    <div
                      className={cn(
                        "earn-money text-base",
                        row.status === "paid" ? "text-cash" : "text-white"
                      )}
                    >
                      {formatToman(row.amount)}
                      <span className="mr-1 text-[10px] font-medium text-white/40">تومان</span>
                    </div>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium",
                        statusClass[row.status]
                      )}
                    >
                      {statusLabel[row.status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
