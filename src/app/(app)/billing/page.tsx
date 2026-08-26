"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  Banknote,
  Loader2,
  Sparkles,
  Wallet,
} from "lucide-react";
import { SectionBadge } from "@/components/section-badge";
import { useStore } from "@/components/store-provider";
import {
  brandCta,
  brandCtaGlow,
  brandGlassCard,
  brandGlowPanel,
  brandHeadlineGradient,
  formFocus,
} from "@/lib/brand";
import { MIN_PAYOUT_TOMAN } from "@/lib/earn";
import type { Wallet as WalletState } from "@/lib/types";
import { cn, formatDate, formatToman } from "@/lib/utils";
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
  paid: "bg-emerald-500/15 text-emerald-300",
  pending: "bg-amber-500/15 text-amber-300",
  rejected: "bg-rose-500/15 text-rose-300",
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
        <h1 className={cn("mt-2 text-2xl font-bold", brandHeadlineGradient)}>
          تاریخچه مالی
        </h1>
        <p className="mt-1 text-sm text-white/55">
          موجودی نقدی و درخواست واریز دستی به شبا یا کارت.{" "}
          <Link href="/help/bardasht" className="text-brand hover:text-brand-soft">
            راهنمای برداشت
          </Link>
        </p>
      </header>

      <section className={cn(brandGlowPanel, "p-6 sm:p-8")}>
        <div
          className="earn-blob pointer-events-none absolute -left-14 -top-14 size-52 rounded-full bg-brand/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs text-white/45">قابل برداشت همین حالا</div>
            <div className="mt-1 text-3xl font-black text-white sm:text-4xl">
              {formatToman(available)}
              <span className="mr-1 text-sm font-normal text-white/40">تومان</span>
            </div>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/40">
              حداقل مبلغ درخواست واریز {formatToman(MIN_PAYOUT_TOMAN)} تومان
              است. معمولاً با یک ویدیوی خوب به این مبلغ می‌رسی. بررسی درخواست
              واریز حداکثر ۴۸ ساعت است.{" "}
              <Link href="/rules" className="text-brand/80 hover:text-brand">
                قوانین برنامه
              </Link>
            </p>
            <div className="mt-3">
              <ReviewSlaPromise />
            </div>
          </div>
          <button
            type="button"
            disabled={!canPayout}
            onClick={openForm}
            className={cn(
              brandCtaGlow,
              "px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            )}
          >
            <Sparkles className="size-4" />
            درخواست واریز
          </button>
        </div>
      </section>

      {pending && (
        <div className="space-y-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-100">
            یک درخواست {formatToman(pending.amount)} تومانی در انتظار بررسی است.
            تا تعیین وضعیت آن نمی‌توانید درخواست جدید بدهید.
          </p>
          <ReviewSlaNotice startedAt={pending.createdAt} />
        </div>
      )}

      {formOpen && (
        <section className={cn(brandGlassCard, "space-y-3 p-5")}>
          <h2 className="font-bold text-white">اطلاعات واریز دستی</h2>
          <p className="text-sm text-white/50">
            مبلغ و شماره شبا یا کارت را وارد کن. بررسی حداکثر ۴۸ ساعت است و زمان
            دقیق نتیجه بعد از ثبت مشخص می‌شود.
          </p>
          <label className="block space-y-1.5">
            <span className="text-xs text-white/50">مبلغ (تومان)</span>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              className={cn(
                "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white",
                formFocus
              )}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-white/50">
              شبا یا شماره کارت و نام صاحب حساب
            </span>
            <textarea
              value={bankNote}
              onChange={(e) => setBankNote(e.target.value)}
              placeholder="مثال: IR120170000000123456789012 به نام نام و نام خانوادگی"
              className={cn(
                "min-h-24 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white",
                formFocus
              )}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className={cn(brandCta, "px-5 py-2.5 text-sm disabled:opacity-50")}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              ثبت درخواست
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm text-white/60 hover:bg-white/5"
            >
              انصراف
            </button>
          </div>
        </section>
      )}

      {error && <p className="text-sm text-rose-300">{error}</p>}
      {success && <p className="text-sm text-emerald-300">{success}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={cn(brandGlassCard, "p-4")}>
          <div className="text-xs text-white/45">مجموع درآمد</div>
          <div className="mt-1 text-lg font-bold text-white">
            {formatToman(state.wallet.lifetimeEarned)} تومان
          </div>
        </div>
        <div className={cn(brandGlassCard, "p-4")}>
          <div className="text-xs text-white/45">واریز شده</div>
          <div className="mt-1 text-lg font-bold text-white">
            {formatToman(state.wallet.lifetimePaidOut)} تومان
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/70">درخواست‌های واریز</h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-white/45">
            هنوز درخواست واریزی ثبت نکرده‌ای.
          </div>
        ) : (
          <div className="space-y-2.5">
            {payouts.map((row) => (
              <div
                key={row.id}
                className={cn(
                  brandGlassCard,
                  "flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-white/50">
                    {row.status === "paid" ? (
                      <Banknote className="size-4" />
                    ) : (
                      <ArrowDownLeft className="size-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      درخواست واریز دستی
                    </div>
                    <div className="mt-0.5 text-xs text-white/40">
                      {formatDate(row.createdAt)}
                      {row.adminNote ? ` · ${row.adminNote}` : ""}
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-rose-300">
                    {formatToman(-row.amount)} تومان
                  </div>
                  <span
                    className={cn(
                      "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px]",
                      statusClass[row.status]
                    )}
                  >
                    {statusLabel[row.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
