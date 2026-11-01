"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Hourglass,
  Landmark,
  Loader2,
  ReceiptText,
  RotateCcw,
  Scale,
  TrendingUp,
  Undo2,
} from "lucide-react";
import { Money } from "@/components/money";
import { SectionBadge } from "@/components/section-badge";
import { useStore } from "@/components/store-provider";
import { brandGlassCard, sectionTitle } from "@/lib/brand";
import {
  ledgerDisplayAmount,
  ledgerTypeLabel,
  type EarnLedgerType,
  type UserLedgerEntryJson,
  type UserLedgerPageJson,
} from "@/lib/earn-ledger-types";
import { MIN_PAID_VIEWS } from "@/lib/earn";
import { cn, formatDateTime, formatToman } from "@/lib/utils";

const typeIcon: Record<EarnLedgerType, typeof Banknote> = {
  base_credit: Banknote,
  bonus_credit: TrendingUp,
  clawback: RotateCcw,
  payout_request: Hourglass,
  payout_paid: Landmark,
  payout_reversal: Undo2,
  adjustment: Scale,
};

/** Money in is lime/green, money out is rose, a completed transfer is neutral. */
function tone(entry: UserLedgerEntryJson) {
  if (entry.type === "payout_paid") return "neutral" as const;
  return entry.balanceDelta >= 0 ? ("in" as const) : ("out" as const);
}

const toneClass = {
  in: "border-cash/30 bg-cash/12 text-cash",
  out: "border-rose-500/30 bg-rose-500/12 text-rose-200",
  neutral: "border-white/12 bg-white/[0.06] text-white/75",
} as const;

export default function HistoryPage() {
  const { ready, state } = useStore();
  const [entries, setEntries] = useState<UserLedgerEntryJson[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (before: string | null) => {
    const query = before ? `?before=${encodeURIComponent(before)}` : "";
    const res = await fetch(`/api/user/earn/ledger${query}`);
    const data = (await res.json()) as UserLedgerPageJson & { error?: string };
    if (!res.ok) throw new Error(data.error || "بارگذاری تاریخچه ناموفق بود");
    return data;
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    fetchPage(null)
      .then((page) => {
        if (cancelled) return;
        setEntries(page.entries);
        setCursor(page.nextCursor);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "بارگذاری تاریخچه ناموفق بود");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, fetchPage]);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await fetchPage(cursor);
      setEntries((prev) => [...prev, ...page.entries]);
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "بارگذاری تاریخچه ناموفق بود");
    } finally {
      setLoadingMore(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  const { wallet } = state;

  return (
    <div className="space-y-6">
      <header>
        <SectionBadge icon={ReceiptText}>صورت حساب</SectionBadge>
        <h1 className={cn("mt-3", sectionTitle)}>تاریخچه درآمد</h1>
        <p className="mt-1 text-sm text-white/55">
          هر پاداش، برداشت و برگشتی که روی کیف پولت اثر گذاشته، به ترتیب زمان.{" "}
          <Link href="/billing" className="text-brand hover:text-brand-soft">
            کیف پول
          </Link>
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className={cn(brandGlassCard, "p-4")}>
          <dt className="text-xs text-white/45">مجموع درآمد</dt>
          <dd className="mt-1">
            <Money amount={wallet.lifetimeEarned} size="md" />
          </dd>
        </div>
        <div className={cn(brandGlassCard, "p-4")}>
          <dt className="text-xs text-white/45">واریز شده به حسابت</dt>
          <dd className="mt-1">
            <Money amount={wallet.lifetimePaidOut} size="md" />
          </dd>
        </div>
        <div className={cn(brandGlassCard, "p-4")}>
          <dt className="text-xs text-white/45">قابل برداشت</dt>
          <dd className="mt-1">
            <Money amount={wallet.available} size="md" />
          </dd>
        </div>
      </dl>

      {error && (
        <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-brand" />
        </div>
      ) : entries.length === 0 ? (
        <div className={cn(brandGlassCard, "px-6 py-14 text-center")}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand/12 text-brand">
            <ReceiptText className="size-5" />
          </div>
          <h3 className="mt-4 font-bold text-white">هنوز تراکنشی نداری</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-white/50">
            اولین ریلت که به {formatToman(MIN_PAID_VIEWS)} بازدید برسد، پاداشش
            همین‌جا ثبت می‌شود.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => {
            const Icon = typeIcon[entry.type];
            const kind = tone(entry);
            const amount = ledgerDisplayAmount(entry);
            const sign = kind === "in" ? "+" : kind === "out" ? "-" : "";
            return (
              <div
                key={entry.id}
                className={cn(
                  brandGlassCard,
                  "flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                      toneClass[kind]
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {ledgerTypeLabel[entry.type]}
                      {entry.campaignTitle ? (
                        <span className="mr-2 text-xs font-normal text-white/45">
                          {entry.campaignTitle}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-white/40">
                      {formatDateTime(entry.createdAt)}
                    </div>
                    {entry.note ? (
                      <div className="mt-1 text-xs text-white/55">{entry.note}</div>
                    ) : null}
                  </div>
                </div>
                <div className="text-left">
                  <div
                    className={cn(
                      "earn-money text-base",
                      kind === "in" && "text-cash",
                      kind === "out" && "text-rose-200",
                      kind === "neutral" && "text-white"
                    )}
                    dir="ltr"
                  >
                    {sign}
                    {formatToman(Math.abs(amount))}
                    <span className="mr-1 text-[10px] font-medium text-white/40">
                      تومان
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-white/35">
                    موجودی بعد: {formatToman(entry.balanceAfter)}
                  </div>
                </div>
              </div>
            );
          })}

          {cursor && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="mx-auto flex h-11 items-center gap-2 rounded-2xl border border-white/12 px-5 text-sm text-white/70 transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              {loadingMore && <Loader2 className="size-4 animate-spin" />}
              نمایش بیشتر
            </button>
          )}
        </div>
      )}
    </div>
  );
}
