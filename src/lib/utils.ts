import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatToman(amount: number) {
  return new Intl.NumberFormat("fa-IR").format(amount);
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Strip grouping marks and map Persian/Arabic digits to a Latin digit string. */
export function digitsFromGrouped(value: string) {
  let digits = "";
  for (const char of value) {
    const persian = PERSIAN_DIGITS.indexOf(char);
    if (persian >= 0) {
      digits += String(persian);
      continue;
    }
    const arabic = ARABIC_DIGITS.indexOf(char);
    if (arabic >= 0) {
      digits += String(arabic);
      continue;
    }
    if (char >= "0" && char <= "9") digits += char;
  }
  return digits;
}

export function parseGroupedNumber(value: string) {
  const digits = digitsFromGrouped(value);
  if (!digits) return NaN;
  return Number(digits);
}

/** Live-format a numeric input with fa-IR thousand separators. */
export function formatGroupedInput(value: string) {
  const digits = digitsFromGrouped(value);
  if (!digits) return "";
  return formatToman(Number(digits));
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Tehran",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("fa-IR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  }).format(new Date(iso));
}

export function formatRemainingDuration(ms: number) {
  if (ms <= 0) return "";
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) {
    const restHours = hours % 24;
    return restHours > 0
      ? `${formatToman(days)} روز و ${formatToman(restHours)} ساعت مانده`
      : `${formatToman(days)} روز مانده`;
  }
  if (hours >= 1) return `${formatToman(hours)} ساعت مانده`;
  return `${formatToman(totalMinutes)} دقیقه مانده`;
}
