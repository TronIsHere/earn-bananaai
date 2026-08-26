import "server-only";
import mongoose, { Schema, type Model } from "mongoose";
import {
  EARN_VERIFICATION_STATUSES,
  type EarnVerificationStatus,
} from "@/lib/earn";
import type { UserRole } from "@/lib/user-roles";

export type SocialStatus = EarnVerificationStatus;

export interface IUser {
  mobileNumber: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  youtubeHandle: string | null;
  youtubeStatus: SocialStatus;
  earnInstagramHandle: string | null;
  earnVerificationCode: string | null;
  earnVerificationStatus: EarnVerificationStatus;
  earnVerifiedAt: Date | null;
  earnVerificationRequestedAt: Date | null;
  earnVerificationNote: string | null;
  earnWalletBalance: number;
  earnWalletLifetimeEarned: number;
  earnWalletLifetimePaidOut: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^09\d{9}$/,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    youtubeHandle: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    youtubeStatus: {
      type: String,
      enum: EARN_VERIFICATION_STATUSES,
      default: "none",
    },
    earnInstagramHandle: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    earnVerificationCode: {
      type: String,
      trim: true,
      default: null,
    },
    earnVerificationStatus: {
      type: String,
      enum: EARN_VERIFICATION_STATUSES,
      default: "none",
      index: true,
    },
    earnVerifiedAt: {
      type: Date,
      default: null,
    },
    earnVerificationRequestedAt: {
      type: Date,
      default: null,
    },
    earnVerificationNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    earnWalletBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    earnWalletLifetimeEarned: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    earnWalletLifetimePaidOut: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

UserSchema.index({ createdAt: -1 });
UserSchema.index({ earnWalletBalance: -1 });
UserSchema.index({ earnVerificationStatus: 1, earnVerificationRequestedAt: 1 });
UserSchema.index({ earnVerificationStatus: 1, updatedAt: -1 });
UserSchema.index(
  { earnInstagramHandle: 1 },
  {
    unique: true,
    partialFilterExpression: {
      earnInstagramHandle: { $type: "string", $gt: "" },
    },
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
