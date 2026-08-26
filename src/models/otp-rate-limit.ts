import "server-only";
import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IOtpRateLimit extends Document {
  key: string;
  lastSentAt: Date;
  hourWindowStart: Date;
  hourCount: number;
  dayWindowStart: Date;
  dayCount: number;
  expiresAt: Date;
}

const OtpRateLimitSchema = new Schema<IOtpRateLimit>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastSentAt: { type: Date, required: true },
    hourWindowStart: { type: Date, required: true },
    hourCount: { type: Number, required: true, default: 0 },
    dayWindowStart: { type: Date, required: true },
    dayCount: { type: Number, required: true, default: 0 },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true }
);

const OtpRateLimit: Model<IOtpRateLimit> =
  mongoose.models.OtpRateLimit ||
  mongoose.model<IOtpRateLimit>("OtpRateLimit", OtpRateLimitSchema);

export default OtpRateLimit;
