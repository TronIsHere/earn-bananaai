import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpLeft,
  Banknote,
  Check,
  Clapperboard,
  Hourglass,
  Link2,
  UserRoundCheck,
} from "lucide-react";
import { brandCta, brandGlassCard } from "@/lib/brand";
import { cn, formatToman } from "@/lib/utils";

export type ChecklistStepState = "done" | "current" | "pending" | "todo";

export type ChecklistStep = {
  key: string;
  icon: LucideIcon;
  title: string;
  hint: string;
  state: ChecklistStepState;
  href?: string;
  cta?: string;
};

export function buildOnboardingSteps(input: {
  instagramStatus: "none" | "pending" | "verified" | "rejected";
  submissionCount: number;
  lifetimeEarned: number;
}): ChecklistStep[] {
  const verified = input.instagramStatus === "verified";
  const verifyPending = input.instagramStatus === "pending";
  const hasSubmission = input.submissionCount > 0;
  const paid = input.lifetimeEarned > 0;

  const steps: ChecklistStep[] = [
    {
      key: "verify",
      icon: UserRoundCheck,
      title: "پیج اینستاگرامت را تأیید کن",
      hint: verifyPending
        ? "درخواست ثبت شده؛ منتظر بررسی تیم بمان."
        : input.instagramStatus === "rejected"
          ? "درخواست قبلی رد شد. کد را دوباره در بیو بگذار و درخواست بده."
          : "کد سفیر بنانا را در بیو بگذار و درخواست بررسی بده.",
      state: verified ? "done" : verifyPending ? "pending" : "todo",
      href: "/profile",
      cta: verifyPending ? "مشاهده وضعیت" : "تأیید پیج",
    },
    {
      key: "create",
      icon: Clapperboard,
      title: "یک کمپین انتخاب کن و ریل بساز",
      hint: "با ابزارهای بنانا ویدیو بساز و طبق چک‌لیست کمپین منتشر کن.",
      state: hasSubmission ? "done" : "todo",
      href: "#campaigns",
      cta: "دیدن کمپین‌ها",
    },
    {
      key: "submit",
      icon: Link2,
      title: "لینک پست را ثبت کن",
      hint: "لینک ریل و اسکرین‌شات را بفرست تا وارد صف بررسی شود.",
      state: hasSubmission ? "done" : "todo",
      href: "/posts",
      cta: "ثبت لینک",
    },
    {
      key: "paid",
      icon: Banknote,
      title: "اولین پاداشت را بگیر",
      hint: "بعد از تأیید، پاداش پایه به کیف پولت واریز می‌شود.",
      state: paid ? "done" : hasSubmission ? "pending" : "todo",
      href: "/billing",
      cta: "کیف پول",
    },
  ];

  // First non-done step becomes the highlighted "current" action.
  const currentIndex = steps.findIndex((step) => step.state !== "done");
  return steps.map((step, index) =>
    index === currentIndex && step.state === "todo"
      ? { ...step, state: "current" }
      : step
  );
}

/** "What do I do next?" rail for the dashboard. Hides itself when done. */
export function OnboardingChecklist({
  steps,
  className,
}: {
  steps: ChecklistStep[];
  className?: string;
}) {
  const doneCount = steps.filter((s) => s.state === "done").length;
  const allDone = doneCount === steps.length;
  if (allDone) return null;

  const active =
    steps.find((s) => s.state === "current") ??
    steps.find((s) => s.state === "pending") ??
    steps[0];

  return (
    <section className={cn(brandGlassCard, "overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-white">قدم بعدی تو</h2>
          <p className="mt-0.5 text-xs text-white/50">
            {formatToman(doneCount)} از {formatToman(steps.length)} قدم انجام شده
          </p>
        </div>
        <div className="flex items-center gap-1.5" aria-hidden>
          {steps.map((step) => (
            <span
              key={step.key}
              className={cn(
                "h-1.5 w-7 rounded-full",
                step.state === "done"
                  ? "bg-brand"
                  : step.state === "current" || step.state === "pending"
                    ? "bg-brand/40"
                    : "bg-white/10"
              )}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-12">
        <ol className="divide-y divide-white/6 lg:col-span-7 lg:border-l lg:border-white/6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const done = step.state === "done";
            const current = step.state === "current";
            const pending = step.state === "pending";
            return (
              <li
                key={step.key}
                className={cn(
                  "flex items-center gap-3 px-5 py-3",
                  current && "bg-brand/[0.05]"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    done && "border-brand bg-brand text-brand-ink",
                    current && "border-brand bg-brand/15 text-brand",
                    pending && "border-amber-400/40 bg-amber-400/10 text-amber-200",
                    step.state === "todo" && "border-white/10 bg-black/30 text-white/35"
                  )}
                >
                  {done ? (
                    <Check className="size-4" />
                  ) : pending ? (
                    <Hourglass className="size-3.5" />
                  ) : (
                    formatToman(index + 1)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "flex items-center gap-2 text-sm font-semibold",
                      done ? "text-white/45 line-through decoration-white/20" : "text-white"
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", current ? "text-brand" : "text-white/35")} />
                    <span className="truncate">{step.title}</span>
                  </div>
                </div>
                {pending && (
                  <span className="shrink-0 rounded-full bg-amber-400/12 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                    در انتظار بررسی
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col justify-center gap-3 bg-brand/[0.04] p-5 lg:col-span-5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-brand text-brand-ink">
            <active.icon className="size-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-brand">
              {active.state === "pending" ? "در حال انجام" : "الان انجام بده"}
            </div>
            <h3 className="mt-1 text-base font-bold text-white">{active.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">{active.hint}</p>
          </div>
          {active.href && active.cta && (
            <Link href={active.href} className={cn(brandCta, "w-fit px-5 py-2.5 text-sm")}>
              {active.cta}
              <ArrowUpLeft className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
