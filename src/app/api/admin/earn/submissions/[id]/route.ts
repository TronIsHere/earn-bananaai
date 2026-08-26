import { NextRequest, NextResponse } from "next/server";
import {
  Day7Error,
  enterDay7ViewBonus,
  getAdminSubmissionById,
} from "@/lib/earn-day7";
import {
  approveEarnSubmission,
  rejectEarnSubmission,
  SubmissionError,
} from "@/lib/earn-submissions";
import { requireAdminSession } from "@/lib/session";
import {
  enterDay7ViewsSchema,
  mongoIdSchema,
  reviewSubmissionSchema,
} from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const access = await requireAdminSession();
  if (access.error === "unauthorized") {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }
  if (access.error === "forbidden" || !access.session) {
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });
  }

  const { id } = await context.params;
  const idParsed = mongoIdSchema.safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const review = reviewSubmissionSchema.safeParse(body);
  if (review.success) {
    try {
      if (review.data.decision === "approve") {
        await approveEarnSubmission({
          submissionId: idParsed.data,
          reviewerId: access.session.user.id,
        });
      } else {
        await rejectEarnSubmission({
          submissionId: idParsed.data,
          reviewerId: access.session.user.id,
          reason: review.data.reason,
          allowResubmit: review.data.allowResubmit,
        });
      }

      const submission = await getAdminSubmissionById(idParsed.data);
      return NextResponse.json({ submission });
    } catch (error) {
      if (error instanceof SubmissionError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.httpStatus }
        );
      }
      console.error("Error reviewing submission:", error);
      return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
    }
  }

  const day7 = enterDay7ViewsSchema.safeParse(body);
  if (day7.success) {
    try {
      const result = await enterDay7ViewBonus({
        submissionId: idParsed.data,
        views: day7.data.views,
      });
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Day7Error) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.httpStatus }
        );
      }
      console.error("Error entering day-7 views:", error);
      return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
    }
  }

  const message =
    review.error.issues[0]?.message ||
    day7.error.issues[0]?.message ||
    "درخواست نامعتبر است";
  return NextResponse.json({ error: message }, { status: 400 });
}
