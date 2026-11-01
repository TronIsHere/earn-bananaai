"use client";

import type { LucideIcon } from "lucide-react";
import {
  CircleAlert,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";
import { brandCta } from "@/lib/brand";
import { cn, formatToman } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * Buttons. One size scale so every queue reads the same.
 * ------------------------------------------------------------------------- */

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50";

export const adminBtn = {
  primary: cn(brandCta, "rounded-xl px-4 py-2 text-sm"),
  ghost: cn(
    btnBase,
    "border border-white/10 bg-white/[0.03] font-medium text-white/70 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
  ),
  danger: cn(
    btnBase,
    "border border-rose-500/30 bg-rose-500/[0.08] text-rose-200 hover:bg-rose-500/15"
  ),
  warn: cn(
    btnBase,
    "border border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
  ),
  small:
    "inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-white/65 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50",
} as const;

export const adminField =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30";

/** Flat card for queue items. */
export const adminCard =
  "rounded-2xl border border-white/8 bg-surface transition-colors";

/* ---------------------------------------------------------------------------
 * Page chrome
 * ------------------------------------------------------------------------- */

export function AdminPageHeader({
  icon: Icon,
  title,
  description,
  actions,
  guide,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Longer how-to text, collapsed by default so the queue stays in view. */
  guide?: ReactNode;
}) {
  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-white sm:text-2xl">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-sm text-white/50">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      {guide && (
        <details className="earn-details group rounded-xl border border-white/8 bg-white/[0.02]">
          <summary className="flex items-center gap-2 px-3 py-2 text-xs text-white/50 transition-colors hover:text-white/80">
            <Info className="size-3.5 text-brand" />
            راهنمای این بخش
            <span className="earn-details-chevron mr-auto text-white/30 transition-transform">
              ▾
            </span>
          </summary>
          <div className="border-t border-white/6 px-3 py-2.5 text-xs leading-relaxed text-white/55">
            {guide}
          </div>
        </details>
      )}
    </header>
  );
}

export function AdminRefreshButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={adminBtn.ghost}
      aria-label="نوسازی"
    >
      <RefreshCw className={cn("size-4", loading && "animate-spin")} />
      <span className="hidden sm:inline">نوسازی</span>
    </button>
  );
}

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

/** Filter tabs with optional counts. Scrolls sideways on narrow screens. */
export function AdminSegmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
}) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div
        role="tablist"
        className="inline-flex min-w-max gap-1 rounded-xl border border-white/8 bg-black/30 p-1"
      >
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-white/50 hover:text-white/85"
              )}
            >
              {option.label}
              {option.count != null && (
                <span
                  className={cn(
                    "min-w-5 rounded-md px-1 py-px text-center text-[10px] tabular-nums",
                    active ? "bg-brand text-brand-ink" : "bg-white/8 text-white/50"
                  )}
                >
                  {formatToman(option.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * States
 * ------------------------------------------------------------------------- */

export function AdminLoading({ label = "در حال بارگذاری" }: { label?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(adminCard, "animate-pulse space-y-3 p-5")}
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-white/8" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 rounded bg-white/8" />
              <div className="h-2.5 w-1/4 rounded bg-white/5" />
            </div>
          </div>
          <div className="h-2.5 w-2/3 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export function AdminEmpty({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 px-6 py-16 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-white/[0.04] text-white/35">
        <Icon className="size-6" />
      </div>
      <p className="text-sm font-semibold text-white/75">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-white/40">{hint}</p>}
    </div>
  );
}

export function AdminError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.07] px-4 py-3 text-sm text-rose-200">
      <span className="inline-flex items-center gap-2">
        <CircleAlert className="size-4 shrink-0" />
        {message}
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} className={adminBtn.small}>
          <RefreshCw className="size-3" />
          تلاش دوباره
        </button>
      )}
    </div>
  );
}

export function AdminNotice({
  tone = "success",
  children,
}: {
  tone?: "success" | "warn";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-xl border px-3 py-2 text-sm",
        tone === "success"
          ? "border-cash/25 bg-cash/[0.07] text-emerald-200"
          : "border-amber-500/25 bg-amber-500/[0.07] text-amber-100/90"
      )}
    >
      {children}
    </p>
  );
}

/* ---------------------------------------------------------------------------
 * Small pieces
 * ------------------------------------------------------------------------- */

export type PillTone = "neutral" | "brand" | "cash" | "warn" | "danger";

const pillTone: Record<PillTone, string> = {
  neutral: "bg-white/[0.07] text-white/55",
  brand: "bg-brand/15 text-brand",
  cash: "bg-cash/15 text-cash",
  warn: "bg-amber-500/15 text-amber-200",
  danger: "bg-rose-500/15 text-rose-200",
};

export function AdminPill({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: {
  tone?: PillTone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        pillTone[tone],
        className
      )}
    >
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  );
}

/** Avatar initials + name, with secondary line (handle, mobile). */
export function AdminPerson({
  firstName,
  lastName,
  meta,
  badge,
}: {
  firstName?: string | null;
  lastName?: string | null;
  meta?: ReactNode;
  badge?: ReactNode;
}) {
  const name = [firstName, lastName].filter(Boolean).join(" ") || "کاربر";
  const initials = (firstName?.[0] || "ک") + (lastName?.[0] || "");
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-xs font-bold text-white/75">
        {initials}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-white">{name}</span>
          {badge}
        </div>
        {meta && (
          <div className="truncate text-xs text-white/40">{meta}</div>
        )}
      </div>
    </div>
  );
}

export function AdminExternalLink({
  href,
  children,
  primary,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
        primary
          ? "border-brand/30 bg-brand/[0.08] text-brand hover:bg-brand/15"
          : "border-white/10 text-white/65 hover:bg-white/5 hover:text-white"
      )}
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  );
}

/** Label/value pair for the right rail of queue cards. */
export function AdminStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "brand" | "muted";
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-white/40">{label}</div>
      <div
        className={cn(
          "mt-0.5 truncate text-sm font-semibold tabular-nums",
          tone === "brand" ? "text-brand" : tone === "muted" ? "text-white/55" : "text-white"
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function AdminSpinnerIcon({
  busy,
  icon: Icon,
}: {
  busy: boolean;
  icon: LucideIcon;
}) {
  return busy ? (
    <Loader2 className="size-4 animate-spin" />
  ) : (
    <Icon className="size-4" />
  );
}
