import "server-only";
import type { Types } from "mongoose";
import { isCampaignOpen } from "@/lib/earn";
import type { CampaignJson } from "@/lib/earn-campaigns";
import { sendSmsWithKavenegar } from "@/lib/kavenegar";
import connectDB from "@/lib/mongodb";
import User from "@/models/user";

/** Kavenegar accepts up to 200 comma-joined receptors per sms/send call. */
const SMS_BATCH_SIZE = 100;

function appHost() {
  try {
    return new URL(process.env.NEXTAUTH_URL ?? "").host;
  } catch {
    return "";
  }
}

function campaignOpenedSmsText(title: string) {
  const shortTitle = title.length > 40 ? `${title.slice(0, 40)}…` : title;
  const host = appHost();
  return `کمپین جدید «${shortTitle}» در کمپین بنانا باز شد. زودتر ریلت را بساز و پاداش بگیر.${host ? `\n${host}` : ""}`;
}

/**
 * Texts every marked creator who asked to hear about the next open campaign,
 * then clears their opt-in so each request sends exactly one SMS. Each user is
 * claimed atomically, so two admin saves racing never text anyone twice.
 * Safe to call after any campaign save; it is a no-op unless the campaign is
 * open and someone is waiting.
 */
export async function notifyCampaignOpened(campaign: CampaignJson) {
  if (!isCampaignOpen(campaign)) return;
  // A zero budget means uncapped; a spent one is not worth a text.
  if (
    campaign.totalBudgetToman > 0 &&
    campaign.spentBudgetToman >= campaign.totalBudgetToman
  ) {
    return;
  }

  try {
    await connectDB();

    const claimed: { _id: Types.ObjectId; mobileNumber: string }[] = [];
    for (;;) {
      const user = await User.findOneAndUpdate(
        { earnCampaignSmsOptIn: true, earnCampaignSmsEligible: true },
        { $set: { earnCampaignSmsOptIn: false } },
        { projection: { mobileNumber: 1 } }
      ).lean();
      if (!user) break;
      claimed.push({ _id: user._id, mobileNumber: user.mobileNumber });
    }
    if (claimed.length === 0) return;

    const message = campaignOpenedSmsText(campaign.title);
    for (let i = 0; i < claimed.length; i += SMS_BATCH_SIZE) {
      const batch = claimed.slice(i, i + SMS_BATCH_SIZE);
      try {
        await sendSmsWithKavenegar({
          receptor: batch.map((user) => user.mobileNumber).join(","),
          message,
        });
      } catch (error) {
        // Put them back in line so the next open campaign reaches them.
        await User.updateMany(
          { _id: { $in: batch.map((user) => user._id) } },
          { $set: { earnCampaignSmsOptIn: true } }
        );
        console.error("Campaign opened SMS failed:", error);
      }
    }
  } catch (error) {
    console.error("Campaign opened SMS failed:", error);
  }
}
