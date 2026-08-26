import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "@/lib/user-roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      mobileNumber: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      isAdmin: boolean;
    };
  }

  interface User {
    id: string;
    mobileNumber: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    mobileNumber?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    isAdmin?: boolean;
  }
}
