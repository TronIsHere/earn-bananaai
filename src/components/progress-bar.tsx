import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  trackClassName,
}: {
  /** 0 to 100 */
  value: number;
  className?: string;
  trackClassName?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-white/8",
        trackClassName
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-brand",
          className
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
