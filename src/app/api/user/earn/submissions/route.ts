import { NextRequest, NextResponse } from "next/server";
import {
  createEarnSubmission,
  listUserSubmissionsPage,
  SubmissionError,
} from "@/lib/earn-submissions";
import { requireSession } from "@/lib/session";
import { createSubmissionSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }

  try {
    const data = await listUserSubmissionsPage(session.user.id);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof SubmissionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus }
      );
    }
    console.error("Error listing user submissions:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "وارد شوید" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const parsed = createSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const submission = await createEarnSubmission({
      userId: session.user.id,
      campaignId: parsed.data.campaignId,
      instagramPostUrl: parsed.data.instagramPostUrl,
      proofScreenshotUrl: parsed.data.proofScreenshotUrl,
    });
    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    if (error instanceof SubmissionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus }
      );
    }
    console.error("Error creating submission:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
