import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "@/lib/mongodb";
import User from "@/models/user";
import { verifyOTP, normalizePhoneNumber } from "@/lib/otp-service";
import { normalizeUserRole, resolveIsAdmin, type UserRole } from "@/lib/user-roles";

function applyRoleFlags(
  token: {
    role?: UserRole;
    mobileNumber?: string;
    isAdmin?: boolean;
  },
  role: UserRole
) {
  token.role = role;
  token.isAdmin = resolveIsAdmin({
    role,
    mobileNumber: token.mobileNumber,
  });
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "OTP",
      credentials: {
        mobileNumber: { label: "Mobile Number", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.mobileNumber || !credentials?.otp) {
          return null;
        }

        try {
          await connectDB();

          const verificationResult = await verifyOTP(
            credentials.mobileNumber,
            credentials.otp,
            true
          );

          if (!verificationResult.valid) {
            console.error("OTP verification failed:", verificationResult.error);
            return null;
          }

          const normalizedMobileNumber = normalizePhoneNumber(
            credentials.mobileNumber
          );
          const user = await User.findOne({
            mobileNumber: normalizedMobileNumber,
          });

          if (!user) {
            console.error(
              `User not found for mobile number: ${normalizedMobileNumber}`
            );
            return null;
          }

          const role = normalizeUserRole(user.role);
          const isAdmin = resolveIsAdmin({
            role,
            mobileNumber: user.mobileNumber,
          });

          return {
            id: user._id.toString(),
            mobileNumber: user.mobileNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            role,
            isAdmin,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.mobileNumber = user.mobileNumber;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        applyRoleFlags(token, normalizeUserRole(user.role));
      }

      if (token.role == null && token.mobileNumber) {
        applyRoleFlags(token, "user");
      } else if (token.role != null) {
        applyRoleFlags(token, normalizeUserRole(token.role));
      } else {
        token.isAdmin = false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.mobileNumber = token.mobileNumber as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.role = normalizeUserRole(token.role);
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
