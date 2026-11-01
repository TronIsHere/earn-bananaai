"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Copies `text` to the clipboard and flips to a check mark for a moment. */
export function CopyButton({
  text,
  children = "کپی",
  copiedLabel = "کپی شد",
  className,
  onCopy,
}: {
  text: string;
  children?: ReactNode;
  copiedLabel?: string;
  className?: string;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions). Stay silent.
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/12 px-2.5 py-1 text-[11px] text-white/65 transition-colors hover:bg-white/5 hover:text-white",
        copied && "border-cash/40 text-cash",
        className
      )}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? copiedLabel : children}
    </button>
  );
}
