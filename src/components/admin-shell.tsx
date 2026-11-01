"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Eye,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Menu,
  ScanSearch,
  Shield,
  Trophy,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { BrandMark } from "@/components/brand-mark";
import { useStore } from "@/components/store-provider";
import type { AdminOverviewJson } from "@/lib/admin-overview-types";
import { cn, formatToman } from "@/lib/utils";

export const ADMIN_TABS = [
  "overview",
  "verifications",
  "review",
  "day7",
  "payouts",
  "campaigns",
  "winners",
  "analytics",
  "ledger",
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number];

export function isAdminTab(value: string | null): value is AdminTab {
  return (ADMIN_TABS as readonly string[]).includes(value ?? "");
}

interface NavItem {
  tab: AdminTab;
  label: string;
  icon: LucideIcon;
  count?: (o: AdminOverviewJson) => number;
  overdue?: (o: AdminOverviewJson) => number;
}

const navGroups: { title?: string; items: NavItem[] }[] = [
  {
    items: [{ tab: "overview", label: "نمای کلی", icon: LayoutDashboard }],
  },
  {
    title: "صف‌های کاری",
    items: [
      {
        tab: "verifications",
        label: "تأیید پیج",
        icon: BadgeCheck,
        count: (o) => o.verifications.pending,
        overdue: (o) => o.verifications.overdue,
      },
      {
        tab: "review",
        label: "بررسی ارسال",
        icon: Inbox,
        count: (o) => o.review.pending,
        overdue: (o) => o.review.overdue,
      },
      {
        tab: "day7",
        label: "بازدید روز ۷",
        icon: Eye,
        count: (o) => o.day7.withInsights,
      },
      {
        tab: "payouts",
        label: "واریز دستی",
        icon: Banknote,
        count: (o) => o.payouts.pending,
        overdue: (o) => o.payouts.overdue,
      },
    ],
  },
  {
    title: "کمپین و محتوا",
    items: [
      { tab: "campaigns", label: "کمپین‌ها", icon: Megaphone },
      { tab: "winners", label: "ریل‌های برنده", icon: Trophy },
    ],
  },
  {
    title: "گزارش و حساب",
    items: [
      { tab: "analytics", label: "آمار بازدید", icon: BarChart3 },
      { tab: "ledger", label: "تطبیق دفتر حساب", icon: ScanSearch },
    ],
  },
];

/** Items waiting on an admin, across every queue. */
export function openQueueCount(o: AdminOverviewJson | null) {
  if (!o) return 0;
  return (
    o.verifications.pending +
    o.review.pending +
    o.day7.withInsights +
    o.payouts.pending
  );
}

/* ---------------------------------------------------------------------------
 * Overview context: sidebar badges + overview page share one fetch.
 * ------------------------------------------------------------------------- */

interface AdminContextValue {
  overview: AdminOverviewJson | null;
  overviewError: string | null;
  refreshOverview: () => void;
  tab: AdminTab;
  goTo: (tab: AdminTab, extra?: Record<string, string>) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used inside AdminShell");
  return value;
}

/** Safe variant for panels that may render outside the shell. */
export function useAdminRefresh() {
  return useContext(AdminContext)?.refreshOverview ?? (() => {});
}

function useOverview() {
  const [overview, setOverview] = useState<AdminOverviewJson | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/earn/overview", { cache: "no-store" });
      const data = (await res.json()) as AdminOverviewJson & { error?: string };
      if (!res.ok) {
        setError(data.error || "بارگذاری خلاصه صف‌ها ناموفق بود");
        return;
      }
      setOverview(data);
      setError(null);
    } catch {
      setError("بارگذاری خلاصه صف‌ها ناموفق بود");
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    const id = window.setInterval(() => void refresh(), 60_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return { overview, error, refresh };
}

/* ---------------------------------------------------------------------------
 * Shell
 * ------------------------------------------------------------------------- */

export function AdminShell({
  tab,
  onTabChange,
  children,
}: {
  tab: AdminTab;
  onTabChange: (tab: AdminTab, extra?: Record<string, string>) => void;
  children: ReactNode;
}) {
  const { state } = useStore();
  const { overview, error, refresh } = useOverview();
  const [open, setOpen] = useState(false);
  const openCount = openQueueCount(overview);
  const anyOverdue = Boolean(
    overview &&
      overview.verifications.overdue +
        overview.review.overdue +
        overview.payouts.overdue >
        0
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const goTo = useCallback(
    (next: AdminTab, extra?: Record<string, string>) => {
      setOpen(false);
      onTabChange(next, extra);
      void refresh();
    },
    [onTabChange, refresh]
  );

  const adminName =
    [state.profile.firstName, state.profile.lastName].filter(Boolean).join(" ") ||
    "مدیر";

  const nav = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <BrandMark href="/admin" />
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
          <Shield className="size-3" />
          پنل مدیریت
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {navGroups.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {group.title && (
              <div className="px-3 pb-1 text-[10px] font-semibold tracking-wide text-white/30">
                {group.title}
              </div>
            )}
            {group.items.map((item) => (
              <AdminNavButton
                key={item.tab}
                item={item}
                active={tab === item.tab}
                overview={overview}
                onClick={() => goTo(item.tab)}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/6 px-4 py-4">
        {error && (
          <p className="px-1 text-[11px] text-rose-300/80">{error}</p>
        )}
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand">
            {(state.profile.firstName?.[0] || "م") + (state.profile.lastName?.[0] || "")}
          </div>
          <div className="min-w-0 text-xs">
            <div className="truncate font-semibold text-white/85">{adminName}</div>
            <div className="text-[10px] text-white/35">دسترسی مدیر</div>
          </div>
        </div>
        <Link
          href="/"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/8 px-3 py-2 text-xs text-white/55 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowRight className="size-3.5" />
          بازگشت به داشبورد سازنده
        </Link>
      </div>
    </div>
  );

  return (
    <AdminContext.Provider
      value={{ overview, overviewError: error, refreshOverview: refresh, tab, goTo }}
    >
      <div className="min-h-screen">
        {/* Mobile top bar */}
        <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-white/6 bg-background/85 px-4 py-2.5 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2">
            <BrandMark compact href="/admin" />
            <span className="text-xs font-semibold text-white/60">مدیریت</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-white"
            aria-label="منو"
          >
            {openCount > 0 && (
              <span
                className={cn(
                  "rounded-md px-1.5 text-[11px] font-bold tabular-nums",
                  anyOverdue ? "bg-rose-500 text-white" : "bg-brand text-brand-ink"
                )}
              >
                {formatToman(openCount)}
              </span>
            )}
            <Menu className="size-5" />
          </button>
        </div>

        {open && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="بستن منو"
          />
        )}

        <aside
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-64 border-l border-white/8 bg-[#0a0b0b] transition-transform duration-200 lg:translate-x-0",
            open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          )}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute left-4 top-5 rounded-lg p-1 text-white/50 lg:hidden"
            aria-label="بستن"
          >
            <X className="size-5" />
          </button>
          {nav}
        </aside>

        <main className="min-h-screen lg:pr-64">
          <div className="mx-auto max-w-5xl px-4 pb-16 pt-20 sm:px-6 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    </AdminContext.Provider>
  );
}

function AdminNavButton({
  item,
  active,
  overview,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  overview: AdminOverviewJson | null;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const count = overview && item.count ? item.count(overview) : 0;
  const overdue = overview && item.overdue ? item.overdue(overview) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150",
        active
          ? "bg-brand/12 font-semibold text-brand shadow-[inset_0_0_0_1px_rgba(209,254,23,0.25)]"
          : "text-white/60 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {count > 0 && (
        <span
          className={cn(
            "mr-auto inline-flex min-w-6 items-center justify-center gap-1 rounded-md px-1.5 py-px text-[11px] font-bold tabular-nums",
            overdue > 0
              ? "bg-rose-500/90 text-white"
              : active
                ? "bg-brand text-brand-ink"
                : "bg-white/10 text-white/75"
          )}
          title={overdue > 0 ? `${formatToman(overdue)} مورد از مهلت گذشته` : undefined}
        >
          {formatToman(count)}
        </span>
      )}
    </button>
  );
}
