import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logo + wordmark. One place so header, sidebar, login and footer match. */
export function BrandMark({
  compact = false,
  href = "/",
  className,
}: {
  compact?: boolean;
  href?: string;
  className?: string;
}) {
  const size = compact ? 28 : 40;
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-3", className)}
      aria-label="کمپین بنانا"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/logo.jpeg"
        alt=""
        width={size}
        height={size}
        className={cn(
          "shrink-0 rounded-xl shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
          compact ? "size-7" : "size-10"
        )}
      />
      <div className="min-w-0">
        <div
          className={cn(
            "truncate font-extrabold text-white",
            compact ? "text-sm" : "text-base"
          )}
        >
          کمپین بنانا
        </div>
        {!compact && (
          <p className="truncate text-[11px] text-white/45">
            درآمد از ویدیوهای هوش مصنوعی
          </p>
        )}
      </div>
    </Link>
  );
}
