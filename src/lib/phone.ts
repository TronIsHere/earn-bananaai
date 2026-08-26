/** Canonical Iranian mobile: 09xxxxxxxxx */
export function toIranMobile(phone: string): string {
  const cleaned = phone.trim().replace(/\D/g, "");

  if (cleaned.startsWith("0098") && cleaned.length === 14) {
    return `0${cleaned.slice(4)}`;
  }
  if (cleaned.startsWith("98") && cleaned.length === 12) {
    return `0${cleaned.slice(2)}`;
  }
  if (cleaned.startsWith("9") && cleaned.length === 10) {
    return `0${cleaned}`;
  }
  if (cleaned.startsWith("09") && cleaned.length === 11) {
    return cleaned;
  }

  return cleaned;
}

export function normalizePhoneNumber(phoneNumber: string): string {
  return toIranMobile(phoneNumber);
}
