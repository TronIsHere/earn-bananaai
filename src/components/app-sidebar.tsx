"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  CircleHelp,
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Shield,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { BrandMark } from "@/components/brand-mark";
import { Money } from "@/components/money";
import { useStore } from "@/components/store-provider";
import { MIN_PAYOUT_TOMAN } from "@/lib/earn";
import { cn, formatToman, formatTomanCompact } from "@/lib/utils";

const navItems = [
  { href: "/", label: "داشبورد", icon: LayoutDashboard },
  { href: "/posts", label: "ارسال‌های من", icon: History },
  { href: "/billing", label: "کیف پول", icon: CreditCard },
  { href: "/profile", label: "پروفایل و تأیید پیج", icon: UserRound },
];

const secondaryItems = [
  { href: "/help", label: "راهنما", icon: CircleHelp },
  { href: "/rules", label: "قوانین برنامه", icon: ScrollText },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state, isAdmin } = useStore();
  const [open, setOpen] = useState(false);
  const verified = state.profile.instagramStatus === "verified";
  const pendingVerify = state.profile.instagramStatus === "pending";
  const displayName =
    [state.profile.firstName, state.profile.lastName]
      .filter(Boolean)
      .join(" ") || "حساب شما";
  const initials =
    (state.profile.firstName?.[0] || "ک") + (state.profile.lastName?.[0] || "");
  const available = state.wallet.available;
  const canPayout = available >= MIN_PAYOUT_TOMAN;

  // Lock body scroll while the mobile drawer is open. Links close it on click.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const close = () => setOpen(false);

  const Nav = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <BrandMark />
      </div>

      <Link
        href="/profile"
        onClick={() => setOpen(false)}
        className="mx-4 mb-4 flex items-center gap-2.5 rounded-2xl border border-white/8 bg-surface px-3 py-2.5 transition-colors hover:border-white/15"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-white">{displayName}</div>
          <div
            className={cn(
              "flex items-center gap-1 text-[10px]",
              verified ? "text-cash" : pendingVerify ? "text-amber-300" : "text-white/40"
            )}
          >
            <BadgeCheck className="size-3" />
            {verified
              ? "پیج تأیید شده"
              : pendingVerify
                ? "در انتظار تأیید پیج"
                : "پیج تأیید نشده"}
          </div>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={close} />
        ))}
        <div className="my-3 border-t border-white/6" />
        {secondaryItems.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={close} muted />
        ))}
        {isAdmin && (
          <NavLink
            href="/admin"
            label="پنل مدیریت"
            icon={Shield}
            active={isActive("/admin")}
            onNavigate={close}
            muted
          />
        )}
      </nav>

      <div className="space-y-2 px-4 pb-5">
        <Link
          href="/billing"
          onClick={() => setOpen(false)}
          className={cn(
            "block rounded-2xl border p-4 transition-colors",
            canPayout
              ? "earn-glow-pulse border-brand/40 bg-brand/[0.08] hover:bg-brand/[0.12]"
              : "border-white/8 bg-surface hover:border-white/15"
          )}
        >
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="size-3.5 text-brand" />
              قابل برداشت
            </span>
            {canPayout && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold text-brand-ink">
                آماده واریز
              </span>
            )}
          </div>
          <Money amount={available} size="md" />
          <div className="mt-1.5 text-[10px] text-white/40">
            {canPayout
              ? "درخواست واریز بده"
              : `${formatTomanCompact(Math.max(0, MIN_PAYOUT_TOMAN - available))} تومان تا حداقل برداشت`}
          </div>
        </Link>

        <div className="flex items-center justify-between px-1 text-[11px] text-white/40">
          <span>مجموع درآمد</span>
          <span className="font-semibold text-white/70">
            {formatToman(state.wallet.lifetimeEarned)} تومان
          </span>
        </div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
        >
          <LogOut className="size-3.5" />
          خروج از حساب
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-white/6 bg-background/85 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <BrandMark compact />
        <div className="flex items-center gap-2">
          <Link
            href="/billing"
            className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand"
          >
            <Wallet className="size-3" />
            {formatTomanCompact(available)}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white"
            aria-label="منو"
          >
            <Menu className="size-5" />
          </button>
        </div>
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
          "fixed inset-y-0 right-0 z-50 w-72 border-l border-white/8 bg-[#0a0b0b] transition-transform duration-200 lg:translate-x-0",
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
        {Nav}
      </aside>
    </>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  muted,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Wallet;
  active: boolean;
  muted?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
        active
          ? "bg-brand/12 font-semibold text-brand shadow-[inset_0_0_0_1px_rgba(209,254,23,0.25)]"
          : muted
            ? "text-white/45 hover:bg-white/5 hover:text-white/80"
            : "text-white/65 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
      {active && <span className="mr-auto size-1.5 rounded-full bg-brand" />}
    </Link>
  );
}
