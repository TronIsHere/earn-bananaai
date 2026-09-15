import Link from "next/link";
import { ArrowUpLeft, Banknote, Hourglass, Landmark, Send, Wallet } from "lucide-react";
import { Money } from "@/components/money";
import { ProgressBar } from "@/components/progress-bar";
import { brandCtaGhost, brandCtaGlow, brandMeshPanel } from "@/lib/brand";
import { MIN_PAYOUT_TOMAN } from "@/lib/earn";
import type { Wallet as WalletState } from "@/lib/types";
import { cn, formatToman, formatTomanCompact } from "@/lib/utils";

/**
 * Money-first summary. The withdrawable balance is the headline; everything
 * else answers "how close am I to cash?".
 */
export function WalletHero({
  wallet,
  pendingToman = 0,
  pendingCount = 0,
  hasPendingPayout = false,
  className,
}: {
  wallet: WalletState;
  /** Base payouts sitting in the review queue (not yet credited). */
  pendingToman?: number;
  pendingCount?: number;
  hasPendingPayout?: boolean;
  className?: string;
}) {
  const available = wallet.available;
  const canPayout = available >= MIN_PAYOUT_TOMAN && !hasPendingPayout;
  const toMin = Math.max(0, MIN_PAYOUT_TOMAN - available);
  const pct = Math.min(100, (available / MIN_PAYOUT_TOMAN) * 100);

  return (
    <section className={cn(brandMeshPanel, "p-6 sm:p-8", className)}>
      <div className="earn-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="earn-blob pointer-events-none absolute -left-24 -top-28 size-80 rounded-full bg-brand/15 blur-3xl"
        aria-hidden
      />
      <div className="relative space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/60">
            <Wallet className="size-4 text-brand" />
            موجودی قابل برداشت
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
                <span className="text-white/35">
                  حداقل {formatTomanCompact(MIN_PAYOUT_TOMAN)}
                </span>
              </div>
              <ProgressBar value={pct} trackClassName="bg-white/8" />
            </div>
          ) : (
            <p className="text-sm text-cash">
              به حداقل برداشت رسیدی. همین حالا درخواست واریز بده.
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/billing"
              className={cn(
                canPayout ? brandCtaGlow : brandCtaGhost,
                "px-5 py-2.5 text-sm"
              )}
            >
              <Landmark className="size-4" />
              درخواست واریز
            </Link>
            <Link href="/posts" className={cn(brandCtaGhost, "px-5 py-2.5 text-sm")}>
              <Send className="size-4" />
              ثبت لینک پست
            </Link>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:max-w-xl">
          <Stat
            icon={Banknote}
            label="مجموع درآمد"
            value={wallet.lifetimeEarned}
          />
          <Stat
            icon={Landmark}
            label="واریز شده"
            value={wallet.lifetimePaidOut}
          />
          <Stat
            icon={Hourglass}
            label="در صف بررسی"
            value={pendingToman}
            hint={pendingCount > 0 ? `${formatToman(pendingCount)} ارسال` : undefined}
            accent={pendingToman > 0}
          />
        </dl>
      </div>

      <Link
        href="/billing"
        className="relative mt-5 inline-flex items-center gap-1 text-xs text-white/45 transition-colors hover:text-brand"
      >
        تاریخچه مالی و درخواست‌های واریز
        <ArrowUpLeft className="size-3.5" />
      </Link>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Banknote;
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3",
        accent ? "border-amber-400/25 bg-amber-400/[0.06]" : "border-white/8 bg-black/25"
      )}
    >
      <dt className="flex items-center gap-1 whitespace-nowrap text-[10px] text-white/45">
        <Icon className={cn("size-3 shrink-0", accent ? "text-amber-300" : "text-brand")} />
        {label}
      </dt>
      <dd className="mt-1.5">
        <Money amount={value} size="sm" unit={null} durationMs={700} />
        <div className="text-[10px] text-white/35">{hint ?? "تومان"}</div>
      </dd>
    </div>
  );
}
