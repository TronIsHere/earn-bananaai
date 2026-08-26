import type { LucideIcon } from "lucide-react";
import { brandBadge } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function SectionBadge({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(brandBadge, className)}>
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}
