"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BarChart3,
  CircleCheck,
  Clock3,
  Download,
  Eye,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Plus,
  Trophy,
  TriangleAlert,
} from "lucide-react";
import { AdminError, AdminPageHeader, adminCard } from "@/components/admin-ui";
import { openQueueCount, useAdmin, type AdminTab } from "@/components/admin-shell";
import { Money } from "@/components/money";
import { ProgressBar } from "@/components/progress-bar";
import { useStore } from "@/components/store-provider";
import { brandLimePanel } from "@/lib/brand";
import { remainingBudgetToman } from "@/lib/earn";
import { cn, formatToman, formatTomanCompact } from "@/lib/utils";

export function AdminOverviewPanel() {
  const { overview, overviewError, refreshOverview, goTo } = useAdmin();
  const { state } = useStore();
  const open = openQueueCount(overview);

  if (!overview) {
    return (
      <div className="space-y-6">
        <AdminPageHeader icon={LayoutDashboard} title="نمای کلی" />
        {overviewError ? (
          <AdminError message={overviewError} onRetry={refreshOverview} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn(adminCard, "h-36 animate-pulse")} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const { verifications, review, day7, payouts, campaigns } = overview;
  const remaining = remainingBudgetToman(
    campaigns.spentBudgetToman,
    campaigns.totalBudgetToman
  );
  const spentPct =
    campaigns.totalBudgetToman > 0
      ? (campaigns.spentBudgetToman / campaigns.totalBudgetToman) * 100
      : 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={LayoutDashboard}
        title={state.profile.firstName ? `سلام ${state.profile.firstName}` : "نمای کلی"}
        description={
          open > 0
            ? `${formatToman(open)} کار باز در صف‌ها منتظر توست.`
            : "همه صف‌ها خالی است. کار امروز تمام شد."
        }
      />

      <section className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
        <button
          type="button"
          onClick={() => goTo("payouts")}
          className={cn(
            brandLimePanel,
            "group p-5 text-right transition-transform active:scale-[0.99] sm:p-6"
          )}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-brand-ink/70">
            <span className="inline-flex items-center gap-1.5">
              <Banknote className="size-4" />
              منتظر واریز به سازنده‌ها
            </span>
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          </div>
          <div className="mt-3">
            <Money
              amount={payouts.pendingAmount}
              size="xl"
              valueClassName="text-brand-ink"
              unitClassName="text-brand-ink/60"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-brand-ink/75">
            <span className="rounded-full bg-brand-ink/10 px-2 py-0.5 font-semibold">
              {formatToman(payouts.pending)} درخواست
            </span>
            {payouts.overdue > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-ink px-2 py-0.5 font-semibold text-rose-300">
                <TriangleAlert className="size-3" />
                {formatToman(payouts.overdue)} از مهلت گذشته
              </span>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => goTo("campaigns")}
          className={cn(
            adminCard,
            "group p-5 text-right hover:border-white/15 hover:bg-surface-hover sm:p-6"
          )}
        >
          <div className="flex items-center justify-between text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <Megaphone className="size-4 text-brand" />
              بودجه کمپین‌های فعال
            </span>
            <ArrowLeft className="size-4 text-white/30 transition-transform group-hover:-translate-x-1" />
          </div>
          <div className="mt-3">
            <Money amount={remaining} size="lg" />
            <span className="mr-2 text-xs text-white/40">باقی‌مانده</span>
          </div>
          <ProgressBar value={spentPct} className="mt-4" />
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-white/45">
            <span>
              خرج‌شده {formatTomanCompact(campaigns.spentBudgetToman)} از{" "}
              {formatTomanCompact(campaigns.totalBudgetToman)}
            </span>
            <span>
              {formatToman(campaigns.active)} فعال
              {campaigns.draft > 0 && ` · ${formatToman(campaigns.draft)} پیش‌نویس`}
            </span>
          </div>
        </button>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-white/70">صف‌های کاری</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <QueueTile
            tab="verifications"
            icon={BadgeCheck}
            title="تأیید پیج اینستاگرام"
            count={verifications.pending}
            overdue={verifications.overdue}
            unit="درخواست"
            emptyText="درخواست تأییدی نیست"
          />
          <QueueTile
            tab="review"
            icon={Inbox}
            title="بررسی ارسال‌ها"
            count={review.pending}
            overdue={review.overdue}
            dueSoon={review.dueSoon}
            unit="ریل"
            emptyText="ریلی در صف نیست"
          />
          <QueueTile
            tab="day7"
            icon={Eye}
            title="ثبت بازدید روز ۷"
            count={day7.withInsights}
            unit="اینسایت آماده ثبت"
            footnote={
              day7.waiting > day7.withInsights
                ? `${formatToman(day7.waiting - day7.withInsights)} ریل دیگر منتظر اینسایت سازنده`
                : undefined
            }
            emptyText="اینسایتی برای ثبت نیست"
          />
          <QueueTile
            tab="payouts"
            icon={Banknote}
            title="واریز دستی"
            count={payouts.pending}
            overdue={payouts.overdue}
            unit="درخواست"
            emptyText="درخواست واریزی نیست"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-white/70">میان‌برها</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Shortcut
            icon={Plus}
            label="ساخت کمپین جدید"
            onClick={() => goTo("campaigns", { new: "1" })}
          />
          <Shortcut icon={Trophy} label="انتخاب ریل‌های برنده" onClick={() => goTo("winners")} />
          <Shortcut icon={BarChart3} label="آمار بازدید سایت" onClick={() => goTo("analytics")} />
          <a
            href="/api/admin/earn/payouts/export?status=pending"
            download
            className={shortcutClass}
          >
            <Download className="size-4 text-brand" />
            خروجی CSV واریزها
          </a>
        </div>
      </section>
    </div>
  );
}

function QueueTile({
  tab,
  icon: Icon,
  title,
  count,
  overdue = 0,
  dueSoon = 0,
  unit,
  footnote,
  emptyText,
}: {
  tab: AdminTab;
  icon: LucideIcon;
  title: string;
  count: number;
  overdue?: number;
  dueSoon?: number;
  unit: string;
  footnote?: string;
  emptyText: string;
}) {
  const { goTo } = useAdmin();
  const empty = count === 0;
  return (
    <button
      type="button"
      onClick={() => goTo(tab)}
      className={cn(
        adminCard,
        "group flex flex-col p-5 text-right hover:border-white/15 hover:bg-surface-hover",
        overdue > 0 && "border-rose-500/35"
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              empty ? "bg-white/[0.05] text-white/35" : "bg-brand/12 text-brand"
            )}
          >
            <Icon className="size-4" />
          </span>
          {title}
        </span>
        <ArrowLeft className="size-4 text-white/25 transition-transform group-hover:-translate-x-1 group-hover:text-white/60" />
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span
          className={cn(
            "earn-money text-4xl",
            empty ? "text-white/25" : "text-white"
          )}
        >
          {formatToman(count)}
        </span>
        <span className="text-xs text-white/40">{unit}</span>
      </div>

      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-1.5 text-[11px]">
        {empty ? (
          <span className="inline-flex items-center gap-1 text-cash/80">
            <CircleCheck className="size-3.5" />
            {emptyText}
          </span>
        ) : overdue > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 font-medium text-rose-200">
            <TriangleAlert className="size-3" />
            {formatToman(overdue)} از مهلت ۴۸ ساعته گذشته
          </span>
        ) : dueSoon > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-200">
            <Clock3 className="size-3" />
            {formatToman(dueSoon)} مورد کمتر از ۶ ساعت وقت دارد
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-white/45">
            <Clock3 className="size-3" />
            همه در مهلت
          </span>
        )}
        {footnote && <span className="text-white/35">{footnote}</span>}
      </div>
    </button>
  );
}

const shortcutClass =
  "flex items-center gap-2 rounded-xl border border-white/8 bg-surface px-3.5 py-3 text-sm text-white/75 transition-colors hover:border-white/15 hover:bg-surface-hover hover:text-white";

function Shortcut({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={shortcutClass}>
      <Icon className="size-4 text-brand" />
      {label}
    </button>
  );
}
