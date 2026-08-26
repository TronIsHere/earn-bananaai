import { NextRequest, NextResponse } from "next/server";
import {
  resubmitEarnSubmission,
  SubmissionError,
} from "@/lib/earn-submissions";
import { requireSession } from "@/lib/session";
import { mongoIdSchema, resubmitSubmissionSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
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

  const parsed = resubmitSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const submission = await resubmitEarnSubmission({
      userId: session.user.id,
      submissionId: idParsed.data,
      instagramPostUrl: parsed.data.instagramPostUrl,
      proofScreenshotUrl: parsed.data.proofScreenshotUrl,
    });
    return NextResponse.json({ submission });
  } catch (error) {
    if (error instanceof SubmissionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus }
      );
    }
    console.error("Error resubmitting:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
