function normalizeMobile(mobile: string): string {
  return mobile.trim().replace(/\s+/g, "");
}

/**
 * Admin mobiles from ADMIN_MOBILES (comma-separated).
 * Production: empty list if unset (fail closed).
 */
export function getAdminMobiles(): string[] {
  const raw = process.env.ADMIN_MOBILES?.trim();
  if (!raw) return [];

  return [
    ...new Set(
      raw
        .split(",")
        .map((mobile) => normalizeMobile(mobile))
        .filter(Boolean)
    ),
  ];
}

export function isAdminMobile(mobile?: string | null): boolean {
  if (!mobile) return false;
  return getAdminMobiles().includes(normalizeMobile(mobile));
}
