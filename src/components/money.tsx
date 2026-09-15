"use client";

import { useEffect, useRef, useState } from "react";
import { cn, formatToman } from "@/lib/utils";

const sizes = {
  sm: { value: "text-base", suffix: "text-[11px]" },
  md: { value: "text-xl sm:text-2xl", suffix: "text-xs" },
  lg: { value: "text-3xl sm:text-4xl", suffix: "text-sm" },
  xl: { value: "text-4xl sm:text-5xl", suffix: "text-base" },
  hero: { value: "text-5xl sm:text-6xl lg:text-7xl", suffix: "text-base sm:text-lg" },
} as const;

/**
 * Ease-out count from the last displayed value to `target`. Tracks the shown
 * value in a ref so strict-mode double effects and rapid target changes
 * resume from wherever the number currently is.
 */
function useCountUp(target: number, durationMs: number, enabled: boolean) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const shownRef = useRef(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) return;
    const from = shownRef.current;
    const delta = target - from;
    if (delta === 0) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + delta * eased);
      shownRef.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, enabled]);

  return enabled ? value : target;
}

/**
 * Toman amount with a small unit suffix. Counts up on mount and on change so
 * balances feel alive. Tabular digits keep widths stable while animating.
 */
export function Money({
  amount,
  size = "md",
  unit = "تومان",
  animate = true,
  durationMs = 900,
  className,
  valueClassName,
  unitClassName,
}: {
  amount: number;
  size?: keyof typeof sizes;
  unit?: string | null;
  animate?: boolean;
  durationMs?: number;
  className?: string;
  valueClassName?: string;
  unitClassName?: string;
}) {
  const shown = useCountUp(amount, durationMs, animate);
  const s = sizes[size];
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span className={cn("earn-money text-white", s.value, valueClassName)}>
        {formatToman(shown)}
      </span>
      {unit ? (
        <span className={cn("font-medium text-white/45", s.suffix, unitClassName)}>
          {unit}
        </span>
      ) : null}
    </span>
  );
}
