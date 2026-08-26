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
import { useState } from "react";
import { signOut } from "next-auth/react";
import { brandCtaGlow, brandHeadlineGradient } from "@/lib/brand";
import { cn, formatToman } from "@/lib/utils";
import { useStore } from "@/components/store-provider";

const navItems = [
  { href: "/", label: "داشبورد", icon: LayoutDashboard },
  { href: "/posts", label: "پست‌ها", icon: History },
  { href: "/profile", label: "پروفایل", icon: UserRound },
  { href: "/billing", label: "تاریخچه مالی", icon: CreditCard },
  { href: "/help", label: "راهنما", icon: CircleHelp },
  { href: "/rules", label: "قوانین برنامه", icon: ScrollText },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state, isAdmin } = useStore();
  const [open, setOpen] = useState(false);
  const verified = state.profile.instagramStatus === "verified";
  const displayName =
    [state.profile.firstName, state.profile.lastName]
      .filter(Boolean)
      .join(" ") || "حساب شما";

  const Nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/logo.jpeg"
          alt="بنانا"
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-md"
        />
        <div className="min-w-0">
          <div
            className={cn(
              "truncate text-base font-bold",
              brandHeadlineGradient,
            )}
          >
            کمپین بنانا
          </div>
          <p className="truncate text-[11px] text-white/45">
            برنامه رسمی کسب درآمد
          </p>
        </div>
      </div>

      <div className="mx-4 mb-4 flex items-center gap-2.5 rounded-2xl border border-white/8 bg-surface px-3 py-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
          {(state.profile.firstName?.[0] || "ک") +
            (state.profile.lastName?.[0] || "")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-white">
            {displayName}
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-[10px]",
              verified ? "text-emerald-400" : "text-white/35",
            )}
          >
            <BadgeCheck className="size-3" />
            {verified ? "حساب تأیید شده" : "در انتظار تأیید"}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
                active
                  ? "bg-brand/12 text-brand shadow-[inset_0_0_0_1px_rgba(209,254,23,0.25)]"
                  : "text-white/60 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
              {active && (
                <span className="mr-auto size-1.5 rounded-full bg-brand" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 px-4 pb-5">
        <div className="earn-glow-pulse relative overflow-hidden rounded-2xl border border-brand/25 bg-brand/[0.06] p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-white/50">
            <Wallet className="size-3.5" />
            موجودی قابل برداشت
          </div>
          <div className="text-lg font-bold text-white">
            {formatToman(state.wallet.available)}
            <span className="mr-1 text-xs font-normal text-white/40">
              تومان
            </span>
          </div>
        </div>

        <Link
          href="/billing"
          onClick={() => setOpen(false)}
          className={cn(brandCtaGlow, "w-full px-4 py-3 text-sm")}
        >
          درآمد من: {formatToman(state.wallet.lifetimeEarned)} تومان
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-white/45 transition-colors hover:bg-white/5 hover:text-white/70"
          >
            <Shield className="size-3.5" />
            پنل مدیریت
          </Link>
        )}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-white/45 transition-colors hover:bg-white/5 hover:text-white/70"
        >
          <LogOut className="size-3.5" />
          خروج
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-40 flex size-10 items-center justify-center rounded-full border border-white/10 bg-black/90 text-white shadow-lg backdrop-blur lg:hidden"
        aria-label="منو"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="بستن منو"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 border-l border-white/8 bg-[#0b0b0b] transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-4 left-4 rounded-lg p-1 text-white/50 lg:hidden"
          aria-label="بستن"
        >
          <X className="size-5" />
        </button>
        {Nav}
      </aside>
    </>
  );
}
