"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SectionBadge } from "@/components/section-badge";
import {
  HELP_CATEGORIES,
  helpGuides,
  popularHelpGuides,
  searchHelpGuides,
  type HelpCategoryId,
  type HelpGuide,
} from "@/lib/help-guides";
import {
  brandCtaGhost,
  brandGlassCard,
  brandGlassCardHover,
  brandGlowPanel,
  brandIconBg,
} from "@/lib/brand";
import { cn } from "@/lib/utils";

const categoryIcons: Record<
  HelpCategoryId,
  typeof Rocket
> = {
  start: Rocket,
  verify: ShieldCheck,
  campaigns: LayoutDashboard,
  posts: Send,
  payouts: CreditCard,
  rules: BadgeCheck,
};

function GuideCard({ guide }: { guide: HelpGuide }) {
  const category = HELP_CATEGORIES.find((item) => item.id === guide.category);
  const Icon = categoryIcons[guide.category];

  return (
    <Link
      href={`/help/${guide.slug}`}
      className={cn(brandGlassCard, brandGlassCardHover, "flex flex-col p-5")}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/6 px-2.5 py-0.5 text-[11px] text-white/50">
          {category?.title}
        </span>
        <span className="text-[11px] text-white/35">
          {guide.minutes.toLocaleString("fa-IR")} دقیقه
        </span>
      </div>
      <div
        className={cn(
          "mb-3 flex size-10 items-center justify-center rounded-2xl",
          brandIconBg
        )}
      >
        <Icon className="size-5 text-brand" />
      </div>
      <h3 className="font-bold text-white">{guide.title}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-white/55">
        {guide.description}
      </p>
      <span className="mt-4 text-sm font-semibold text-brand">خواندن راهنما</span>
    </Link>
  );
}

export function HelpCenter() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategoryId | "all">("all");

  const results = useMemo(() => {
    const found = searchHelpGuides(query);
    if (category === "all") return found;
    return found.filter((guide) => guide.category === category);
  }, [query, category]);

  const popular = popularHelpGuides();
  const searching = query.trim().length > 0 || category !== "all";

  return (
    <div className="space-y-10">
      <section className={cn(brandGlowPanel, "p-6 sm:p-10")}>
        <div
          className="earn-blob pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-brand/10 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-4">
          <SectionBadge icon={CircleHelp}>مرکز راهنما</SectionBadge>
          <h1 className="max-w-2xl text-2xl font-extrabold text-white sm:text-4xl">
            کمکت می‌کنیم از کمپین بنانا درآمد بگیری
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
            راهنمای ورود، تأیید اینستاگرام، ارسال پست، پاداش بازدید و برداشت پول.
            هر موضوع را باز کن یا همین‌جا جستجو کن.
          </p>
          <label className="relative block max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="مثلاً کد بیو، اسکرین‌شات، برداشت..."
              className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pr-10 pl-4 text-sm text-white placeholder:text-white/35 focus:border-brand/50 focus:ring-1 focus:ring-brand/25"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              category === "all"
                ? "bg-brand/15 text-brand"
                : "bg-white/5 text-white/55 hover:bg-white/8 hover:text-white/80"
            )}
          >
            همه موضوعات
          </button>
          {HELP_CATEGORIES.map((item) => {
            const Icon = categoryIcons[item.id];
            const active = category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-brand/15 text-brand"
                    : "bg-white/5 text-white/55 hover:bg-white/8 hover:text-white/80"
                )}
              >
                <Icon className="size-3.5" />
                {item.title}
              </button>
            );
          })}
        </div>
      </section>

      {searching ? (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">
            {results.length > 0
              ? `${results.length.toLocaleString("fa-IR")} راهنما`
              : "نتیجه‌ای پیدا نشد"}
          </h2>
          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-white/45">
              عبارت دیگری را امتحان کن، یا از موضوعات بالا یکی را انتخاب کن.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {results.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="space-y-4">
            <div>
              <SectionBadge icon={Sparkles}>پرکاربرد</SectionBadge>
              <h2 className="mt-2 text-xl font-bold text-white">
                راهنماهایی که بیشتر خوانده می‌شوند
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {popular.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">همه موضوعات</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {HELP_CATEGORIES.map((item) => {
                const Icon = categoryIcons[item.id];
                const count = helpGuides.filter(
                  (guide) => guide.category === item.id
                ).length;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={cn(
                      brandGlassCard,
                      brandGlassCardHover,
                      "p-5 text-right"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-3 flex size-10 items-center justify-center rounded-2xl",
                        brandIconBg
                      )}
                    >
                      <Icon className="size-5 text-brand" />
                    </div>
                    <div className="font-bold text-white">{item.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-white/50">
                      {item.description}
                    </p>
                    <p className="mt-3 text-xs text-white/35">
                      {count.toLocaleString("fa-IR")} راهنما
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white">فهرست کامل اسناد</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {helpGuides.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          </section>
        </>
      )}

      <section className={cn(brandGlassCard, "flex flex-wrap items-center justify-between gap-4 p-5")}>
        <div>
          <div className="font-semibold text-white">آماده ارسال هستی؟</div>
          <p className="mt-1 text-sm text-white/50">
            اگر پیجت تأیید شده، از صفحه پست‌ها لینک را بفرست. اگر نه، اول پروفایل
            را کامل کن.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/profile" className={cn(brandCtaGhost, "px-4 py-2.5 text-sm")}>
            تأیید اینستاگرام
          </Link>
          <Link href="/posts" className={cn(brandCtaGhost, "px-4 py-2.5 text-sm")}>
            ارسال پست
          </Link>
        </div>
      </section>
    </div>
  );
}
