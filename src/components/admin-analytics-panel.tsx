"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Eye, Send, UserRound, Users } from "lucide-react";
import {
  AdminError,
  AdminPageHeader,
  AdminRefreshButton,
  adminCard,
} from "@/components/admin-ui";
import { StatCard } from "@/components/stat-card";
import { brandGlassCard } from "@/lib/brand";
import type { AnalyticsSummary } from "@/lib/analytics-types";
import { cn, formatDate, formatToman } from "@/lib/utils";

export function AdminAnalyticsPanel() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/analytics");
      const json = (await response.json()) as AnalyticsSummary & {
        error?: string;
      };
      if (!response.ok) {
        setError(json.error || "بارگذاری آمار ناموفق بود");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("بارگذاری آمار ناموفق بود");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const maxDailyViews = useMemo(() => {
    if (!data?.daily.length) return 1;
    return Math.max(1, ...data.daily.map((row) => row.views));
  }, [data]);

  const header = (
    <AdminPageHeader
      icon={BarChart3}
      title="آمار بازدید سایت"
      description="بازدید کل و بازدیدکننده یکتا از ورود تا داشبورد. پنل مدیریت شمرده نمی‌شود."
      actions={<AdminRefreshButton onClick={() => void load()} loading={loading} />}
    />
  );

  if (!data) {
    return (
      <div className="space-y-5">
        {header}
        {error ? (
          <AdminError message={error} onRetry={() => void load()} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn(adminCard, "h-28 animate-pulse")} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const { totals } = data;

  return (
    <div className="space-y-5">
      {header}

      {error && <AdminError message={error} onRetry={() => void load()} />}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Eye}
          label="بازدید کل"
          value={formatToman(totals.views)}
          highlight
        />
        <StatCard
          icon={Users}
          label="بازدیدکننده یکتا"
          value={formatToman(totals.uniqueVisitors)}
        />
        <StatCard
          icon={UserRound}
          label="کاربر یکتای واردشده"
          value={formatToman(totals.uniqueUsers)}
        />
        <StatCard
          icon={Eye}
          label="بازدید امروز"
          value={formatToman(totals.viewsToday)}
          suffix={`${formatToman(totals.uniqueVisitorsToday)} یکتا`}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <StatCard
          icon={Users}
          label="کاربران ثبت‌شده"
          value={formatToman(totals.registeredUsers)}
        />
        <StatCard
          icon={Send}
          label="کل ارسال‌ها"
          value={formatToman(totals.submissions)}
        />
      </section>

      <section className={cn(brandGlassCard, "p-5")}>
        <h2 className="text-sm font-semibold text-white">۱۴ روز اخیر</h2>
        <p className="mt-1 text-xs text-white/40">
          ستون‌ها بازدید هستند؛ عدد پایین هر ستون بازدیدکننده یکتای همان روز است.
        </p>
        <div className="mt-5 flex items-end gap-1.5 sm:gap-2">
          {data.daily.map((row) => {
            const height = Math.max(6, Math.round((row.views / maxDailyViews) * 120));
            return (
              <div
                key={row.day}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
              >
                <span className="text-[10px] text-white/45">
                  {formatToman(row.views)}
                </span>
                <div
                  className="w-full max-w-8 rounded-t-md bg-brand/80 transition-colors hover:bg-brand"
                  style={{ height }}
                  title={`${row.day}: ${row.views} بازدید، ${row.uniqueVisitors} یکتا`}
                />
                <span className="text-[10px] text-white/35">
                  {formatDate(`${row.day}T12:00:00+03:30`).replace(/،.*/, "")}
                </span>
                <span className="text-[10px] text-white/25">
                  {formatToman(row.uniqueVisitors)} یکتا
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className={cn(brandGlassCard, "overflow-hidden")}>
        <div className="border-b border-white/8 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">صفحات پربازدید</h2>
        </div>
        {data.paths.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-white/45">
            هنوز بازدیدی ثبت نشده است. بعد از ورود کاربران، آمار اینجا می‌آید.
          </p>
        ) : (
          <div className="divide-y divide-white/8">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-5 py-2 text-[11px] text-white/35">
              <span>صفحه</span>
              <span>بازدید</span>
              <span>یکتا</span>
            </div>
            {data.paths.map((row) => (
              <div
                key={row.path}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-5 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate text-white">{row.label}</div>
                  <div className="truncate font-mono text-[11px] text-white/30" dir="ltr">
                    {row.path}
                  </div>
                </div>
                <span className="tabular-nums text-white/80">
                  {formatToman(row.views)}
                </span>
                <span className="tabular-nums text-brand">
                  {formatToman(row.uniqueVisitors)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
