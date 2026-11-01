/** Client-safe helpers for Iranian SHEBA numbers (IBAN: IR + 24 digits). */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toLatinDigits(value: string): string {
  let out = "";
  for (const char of value) {
    const persian = PERSIAN_DIGITS.indexOf(char);
    if (persian >= 0) {
      out += String(persian);
      continue;
    }
    const arabic = ARABIC_DIGITS.indexOf(char);
    out += arabic >= 0 ? String(arabic) : char;
  }
  return out;
}

/**
 * Canonical form: uppercase `IR` + 24 digits. Accepts Persian/Arabic digits,
 * spaces, dashes and a missing `IR` prefix. Anything that is still not a
 * well-formed SHEBA comes back stripped but unchanged in shape, so callers
 * must run `isValidSheba` on the result.
 */
export function normalizeSheba(raw: string): string {
  const cleaned = toLatinDigits(raw)
    .replace(/[^0-9A-Za-z]/g, "")
    .toUpperCase();
  if (/^\d{24}$/.test(cleaned)) return `IR${cleaned}`;
  return cleaned;
}

/** ISO 7064 mod-97-10 check over the rearranged IBAN. */
function ibanChecksumOk(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    // Digits stay as they are, letters become 10..35 (I = 18, R = 27).
    const numeric = code >= 65 && code <= 90 ? String(code - 55) : char;
    for (const digit of numeric) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

export function isValidSheba(value: string): boolean {
  const sheba = normalizeSheba(value);
  return /^IR\d{24}$/.test(sheba) && ibanChecksumOk(sheba);
}

/** `IR12 3456 7890 1234 5678 9012 34`, for display. Returns input if malformed. */
export function formatSheba(value: string): string {
  const sheba = normalizeSheba(value);
  if (!/^IR\d{24}$/.test(sheba)) return value;
  return sheba.replace(/(.{4})/g, "$1 ").trim();
}

/** Live-format while typing: keeps what the user typed, groups by four. */
export function formatShebaInput(value: string): string {
  const cleaned = toLatinDigits(value)
    .replace(/[^0-9A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 26);
  return cleaned.replace(/(.{4})/g, "$1 ").trim();
}

/** Bank code is the three digits after `IR` + two check digits. */
const BANK_BY_CODE: Record<string, string> = {
  "010": "بانک مرکزی",
  "011": "بانک صنعت و معدن",
  "012": "بانک ملت",
  "013": "بانک رفاه",
  "014": "بانک مسکن",
  "015": "بانک سپه",
  "016": "بانک کشاورزی",
  "017": "بانک ملی",
  "018": "بانک تجارت",
  "019": "بانک صادرات",
  "020": "بانک توسعه صادرات",
  "021": "پست بانک",
  "022": "بانک توسعه تعاون",
  "052": "بانک قوامین",
  "053": "بانک کارآفرین",
  "054": "بانک پارسیان",
  "055": "بانک اقتصاد نوین",
  "056": "بانک سامان",
  "057": "بانک پاسارگاد",
  "058": "بانک سرمایه",
  "059": "بانک سینا",
  "060": "بانک مهر ایران",
  "061": "بانک شهر",
  "062": "بانک آینده",
  "063": "بانک انصار",
  "064": "بانک گردشگری",
  "065": "بانک حکمت ایرانیان",
  "066": "بانک دی",
  "069": "بانک ایران زمین",
  "070": "بانک رسالت",
};

/** Display hint only. The SHEBA itself is what the transfer uses. */
export function shebaBankName(value: string | null | undefined): string | null {
  if (!value) return null;
  const sheba = normalizeSheba(value);
  if (!/^IR\d{24}$/.test(sheba)) return null;
  return BANK_BY_CODE[sheba.slice(4, 7)] ?? null;
}

/** Keeps the last four digits visible: `IR•• •••• •••• •••• •••• ••34`. */
export function maskSheba(value: string | null | undefined): string {
  if (!value) return "";
  const sheba = normalizeSheba(value);
  if (!/^IR\d{24}$/.test(sheba)) return "";
  return `IR•• •••• •••• •••• •••• ••${sheba.slice(-2)}`;
}
