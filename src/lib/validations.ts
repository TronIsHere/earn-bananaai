import { z } from "zod";
import {
  EARN_CAMPAIGN_STATUSES,
  EARN_PLATFORMS,
  MIN_PAID_VIEWS,
  MIN_PAYOUT_TOMAN,
} from "./earn";
import { isValidInstagramHandle, normalizeInstagramHandle } from "./instagram";
import { toIranMobile } from "./phone";
import {
  isValidToolUrl,
  MAX_PROMPT_LENGTH,
  MAX_PROMPT_PACK_ITEMS,
  MAX_PROMPT_TITLE_LENGTH,
} from "./prompt-pack";
import { isValidSheba, normalizeSheba } from "./sheba";

export const mobileNumberSchema = z
  .string()
  .min(1, "شماره موبایل الزامی است")
  .transform(toIranMobile)
  .refine((value) => /^09\d{9}$/.test(value), {
    message: "شماره موبایل باید با 09 شروع شود و 11 رقم باشد",
  });

export const otpSchema = z
  .string()
  .length(6, "کد تأیید باید 6 رقم باشد")
  .regex(/^\d{6}$/, "کد تأیید باید فقط شامل اعداد باشد");

export const firstNameSchema = z
  .string()
  .min(2, "نام باید حداقل 2 کاراکتر باشد")
  .max(50, "نام نمی‌تواند بیشتر از 50 کاراکتر باشد")
  .regex(
    /^[\u0600-\u06FFa-zA-Z\s]+$/,
    "نام باید فقط شامل حروف فارسی یا انگلیسی باشد"
  );

export const lastNameSchema = z
  .string()
  .min(2, "نام خانوادگی باید حداقل 2 کاراکتر باشد")
  .max(50, "نام خانوادگی نمی‌تواند بیشتر از 50 کاراکتر باشد")
  .regex(
    /^[\u0600-\u06FFa-zA-Z\s]+$/,
    "نام خانوادگی باید فقط شامل حروف فارسی یا انگلیسی باشد"
  );

const handleSchema = z
  .string()
  .trim()
  .transform(normalizeInstagramHandle)
  .refine((value) => value.length === 0 || isValidInstagramHandle(value), {
    message: "نام کاربری اینستاگرام نامعتبر است",
  });

export const instagramHandleSchema = z
  .string()
  .min(1, "نام کاربری اینستاگرام الزامی است")
  .transform(normalizeInstagramHandle)
  .refine(isValidInstagramHandle, {
    message: "نام کاربری اینستاگرام نامعتبر است",
  });

/** Empty string clears the field; anything else must be a valid SHEBA. */
export const shebaSchema = z
  .string()
  .trim()
  .transform(normalizeSheba)
  .refine((value) => value === "" || isValidSheba(value), {
    message: "شماره شبا نامعتبر است. با IR شروع می‌شود و ۲۴ رقم دارد.",
  });

export const accountHolderSchema = z
  .string()
  .trim()
  .max(100, "نام صاحب حساب خیلی طولانی است")
  .refine(
    (value) =>
      value === "" ||
      (value.length >= 3 && /^[\u0600-\u06FFa-zA-Z\s\u200c]+$/.test(value)),
    { message: "نام صاحب حساب را با حروف فارسی یا انگلیسی بنویسید" }
  );

export const profileUpdateSchema = z
  .object({
    firstName: firstNameSchema.optional(),
    lastName: lastNameSchema.optional(),
    instagramHandle: handleSchema.optional(),
    bankSheba: shebaSchema.optional(),
    bankAccountHolder: accountHolderSchema.optional(),
  })
  .refine(
    (data) =>
      (data.bankSheba === undefined) === (data.bankAccountHolder === undefined) &&
      Boolean(data.bankSheba) === Boolean(data.bankAccountHolder),
    { message: "شماره شبا و نام صاحب حساب را با هم وارد کنید" }
  );

export const mongoIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "شناسه نامعتبر است");

const INSTAGRAM_POST_KINDS = new Set(["p", "reel", "reels", "tv"]);

/** Canonical Instagram post/reel URL, or null if the host/path is not a post. */
export function normalizeInstagramPostUrl(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "instagram.com") return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    const kind = parts[0];
    const id = parts[1];
    if (!kind || !id || !INSTAGRAM_POST_KINDS.has(kind)) return null;
    if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;

    const canonicalKind = kind === "reels" ? "reel" : kind;
    return `https://www.instagram.com/${canonicalKind}/${id}`;
  } catch {
    return null;
  }
}

export const instagramPostUrlSchema = z
  .string()
  .trim()
  .min(1, "لینک پست الزامی است")
  .transform((value, ctx) => {
    const normalized = normalizeInstagramPostUrl(value);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "لینک پست اینستاگرام معتبر نیست. از لینک پست، ریلز یا IGTV استفاده کنید.",
      });
      return z.NEVER;
    }
    return normalized;
  });

export const createSubmissionSchema = z.object({
  campaignId: mongoIdSchema,
  instagramPostUrl: instagramPostUrlSchema,
  proofScreenshotUrl: z.string().trim().url("آدرس اسکرین‌شات نامعتبر است"),
});

export const reviewSubmissionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
  }),
  z.object({
    decision: z.literal("revoke"),
  }),
  z.object({
    decision: z.literal("reject"),
    reason: z
      .string()
      .trim()
      .min(3, "دلیل رد کردن را بنویسید")
      .max(1000, "دلیل رد کردن خیلی طولانی است"),
    allowResubmit: z.boolean().optional().default(true),
  }),
]);

export const resubmitSubmissionSchema = z.object({
  instagramPostUrl: instagramPostUrlSchema,
  proofScreenshotUrl: z.string().trim().url("آدرس اسکرین‌شات نامعتبر است"),
});

export const submitDay7InsightsSchema = z.object({
  views: z.coerce
    .number({ error: "تعداد بازدید نامعتبر است" })
    .int("تعداد بازدید باید عدد صحیح باشد")
    .min(0, "تعداد بازدید نمی‌تواند منفی باشد")
    .max(1_000_000_000, "تعداد بازدید بیش از حد مجاز است"),
  screenshotUrl: z.string().trim().url("آدرس اسکرین‌شات نامعتبر است"),
});

export const featureSubmissionSchema = z.object({
  action: z.literal("feature"),
  featured: z.boolean(),
});

export const enterDay7ViewsSchema = z.object({
  action: z.literal("enter_views"),
  views: z.coerce
    .number({ error: "تعداد بازدید نامعتبر است" })
    .int("تعداد بازدید باید عدد صحیح باشد")
    .min(0, "تعداد بازدید نمی‌تواند منفی باشد")
    .max(1_000_000_000, "تعداد بازدید بیش از حد مجاز است"),
});

const tomanInt = z.coerce
  .number({ error: "مبلغ نامعتبر است" })
  .int("مبلغ باید عدد صحیح باشد")
  .min(0, "مبلغ نمی‌تواند منفی باشد");

function normalizeTags(items: string[]) {
  return items
    .map((item) => item.trim().replace(/^[#@]+/, ""))
    .filter(Boolean);
}

const tagListSchema = z
  .array(z.string())
  .optional()
  .transform((items) => normalizeTags(items ?? []));

const optionalTagListSchema = z
  .array(z.string())
  .optional()
  .transform((items) => (items === undefined ? undefined : normalizeTags(items)));

const checklistSchema = z
  .array(z.string())
  .optional()
  .transform((items) =>
    (items ?? []).map((item) => item.trim()).filter(Boolean)
  );

const optionalChecklistSchema = z
  .array(z.string())
  .optional()
  .transform((items) =>
    items === undefined
      ? undefined
      : items.map((item) => item.trim()).filter(Boolean)
  );

const viewBonusTierItemSchema = z.object({
  minViews: z.coerce
    .number({ error: "بازدید سطح نامعتبر است" })
    .int()
    .min(
      MIN_PAID_VIEWS,
      `حداقل بازدید هر سطح ${MIN_PAID_VIEWS.toLocaleString("fa-IR")} است`
    ),
  bonusToman: tomanInt,
});

const viewBonusTiersSchema = z
  .array(viewBonusTierItemSchema)
  .optional()
  .transform((tiers) =>
    (tiers ?? [])
      .filter((tier) => tier.bonusToman > 0)
      .sort((a, b) => a.minViews - b.minViews)
  );

const optionalViewBonusTiersSchema = z
  .array(viewBonusTierItemSchema)
  .optional()
  .transform((tiers) =>
    tiers === undefined
      ? undefined
      : tiers
          .filter((tier) => tier.bonusToman > 0)
          .sort((a, b) => a.minViews - b.minViews)
  );

function parseDeadline(value: string | null | undefined): Date | null {
  if (!value || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

const createDeadlineSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => parseDeadline(value ?? null));

const optionalDeadlineSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) =>
    value === undefined ? undefined : parseDeadline(value)
  );

const toolUrlMessage =
  "لینک ابزار باید با https شروع شود. می‌توانی {prompt} را جای متن پرامپت بگذاری.";

const promptPackSchema = z
  .array(
    z.object({
      title: z
        .string()
        .trim()
        .min(1, "عنوان پرامپت الزامی است")
        .max(MAX_PROMPT_TITLE_LENGTH, "عنوان پرامپت خیلی طولانی است"),
      prompt: z
        .string()
        .trim()
        .min(1, "متن پرامپت الزامی است")
        .max(MAX_PROMPT_LENGTH, "متن پرامپت خیلی طولانی است"),
    })
  )
  .max(MAX_PROMPT_PACK_ITEMS, "تعداد پرامپت‌ها بیش از حد مجاز است");

/** Blank clears the link (null); otherwise it must be a safe https URL. */
const toolUrlSchema = z
  .string()
  .trim()
  .max(2000, toolUrlMessage)
  .transform((value) => (value === "" ? null : value))
  .refine((value) => value === null || isValidToolUrl(value), {
    message: toolUrlMessage,
  });

export const createCampaignSchema = z
  .object({
    title: z.string().trim().min(1, "عنوان کمپین الزامی است").max(200),
    brief: z.string().trim().min(1, "بریف کمپین الزامی است").max(8000),
    platform: z.enum(EARN_PLATFORMS).optional().default("instagram"),
    requirementsChecklist: checklistSchema,
    requiredHashtags: tagListSchema,
    requiredMentions: tagListSchema,
    minVideoLengthSeconds: z.coerce.number().int().min(0).optional().default(0),
    mediaKitUrls: z.array(z.string().trim().url()).optional().default([]),
    viewBonusTiers: viewBonusTiersSchema,
    maxPayoutPerVideoToman: tomanInt,
    maxSubmissionsPerUser: z.coerce.number().int().min(1).optional().default(3),
    totalBudgetToman: tomanInt.optional().default(0),
    deadline: createDeadlineSchema,
    earlyAccessUntil: createDeadlineSchema,
    status: z.enum(EARN_CAMPAIGN_STATUSES).optional().default("draft"),
    trending: z.boolean().optional().default(false),
    toolUrl: toolUrlSchema.optional().default(null),
    promptPack: promptPackSchema.optional().default([]),
  });

export const updateCampaignSchema = z
  .object({
    title: z.string().trim().min(1, "عنوان کمپین الزامی است").max(200).optional(),
    brief: z.string().trim().min(1, "بریف کمپین الزامی است").max(8000).optional(),
    platform: z.enum(EARN_PLATFORMS).optional(),
    requirementsChecklist: optionalChecklistSchema,
    requiredHashtags: optionalTagListSchema,
    requiredMentions: optionalTagListSchema,
    minVideoLengthSeconds: z.coerce.number().int().min(0).optional(),
    mediaKitUrls: z.array(z.string().trim().url()).optional(),
    viewBonusTiers: optionalViewBonusTiersSchema,
    maxPayoutPerVideoToman: tomanInt.optional(),
    maxSubmissionsPerUser: z.coerce.number().int().min(1).optional(),
    totalBudgetToman: tomanInt.optional(),
    deadline: optionalDeadlineSchema,
    earlyAccessUntil: optionalDeadlineSchema,
    status: z.enum(EARN_CAMPAIGN_STATUSES).optional(),
    trending: z.boolean().optional(),
    toolUrl: toolUrlSchema.optional(),
    promptPack: promptPackSchema.optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: "حداقل یک فیلد برای به‌روزرسانی لازم است" }
  );

export const payoutRequestSchema = z.object({
  amount: z.coerce
    .number({ error: "مبلغ نامعتبر است" })
    .int("مبلغ باید عدد صحیح باشد")
    .min(
      MIN_PAYOUT_TOMAN,
      `حداقل مبلغ درخواست واریز ${MIN_PAYOUT_TOMAN.toLocaleString("fa-IR")} تومان است`
    ),
});

export const payoutDecisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("pay"),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    decision: z.literal("reject"),
    note: z
      .string()
      .trim()
      .min(3, "دلیل رد کردن را بنویسید")
      .max(500, "دلیل رد کردن خیلی طولانی است"),
  }),
]);
