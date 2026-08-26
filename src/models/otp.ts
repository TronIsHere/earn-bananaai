import "server-only";
import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IOTP extends Document {
  mobileNumber: string;
  hashedCode: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    hashedCode: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
      max: 5,
    },
  },
  { timestamps: true }
);

OTPSchema.index({ mobileNumber: 1, createdAt: -1 });

const OTP: Model<IOTP> =
  mongoose.models.OTP || mongoose.model<IOTP>("OTP", OTPSchema);

export default OTP;
