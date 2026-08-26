import { isAdminMobile } from "@/lib/admin-mobiles";

export const USER_ROLES = ["user", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    (USER_ROLES as readonly string[]).includes(value)
  );
}

export function normalizeUserRole(role?: string | null): UserRole {
  if (isUserRole(role)) return role;
  return "user";
}

/** Effective admin: DB role or ADMIN_MOBILES bootstrap. */
export function resolveIsAdmin(params: {
  role?: string | null;
  mobileNumber?: string | null;
}): boolean {
  return (
    normalizeUserRole(params.role) === "admin" ||
    isAdminMobile(params.mobileNumber)
  );
}
