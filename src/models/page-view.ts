import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IPageView {
  visitorId: string;
  userId: Types.ObjectId | null;
  path: string;
  dayKey: string;
  dedupBucket: number;
  ipHash: string | null;
  createdAt: Date;
}

const PageViewSchema = new Schema<IPageView>(
  {
    visitorId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 36,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    path: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    dayKey: {
      type: String,
      required: true,
      trim: true,
    },
    dedupBucket: {
      type: Number,
      required: true,
    },
    ipHash: {
      type: String,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PageViewSchema.index({ visitorId: 1, path: 1, createdAt: -1 });
PageViewSchema.index(
  { visitorId: 1, path: 1, dedupBucket: 1 },
  { unique: true }
);
PageViewSchema.index({ dayKey: 1 });
PageViewSchema.index({ createdAt: -1 });
PageViewSchema.index({ userId: 1 });

const existingModel = mongoose.models.PageView as Model<IPageView> | undefined;
if (existingModel && !existingModel.schema.path("dedupBucket")) {
  mongoose.deleteModel("PageView");
}

const PageView: Model<IPageView> =
  mongoose.models.PageView ||
  mongoose.model<IPageView>("PageView", PageViewSchema);

export default PageView;
