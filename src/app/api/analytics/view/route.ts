import { NextRequest, NextResponse } from "next/server";
import {
  ANALYTICS_VISITOR_COOKIE,
  isValidVisitorId,
  newVisitorId,
  recordPageView,
  sanitizeViewPath,
  hashRequestIp,
} from "@/lib/analytics";
import { getRequestIp } from "@/lib/otp-rate-limit";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const path = sanitizeViewPath(
    body && typeof body === "object" && "path" in body
      ? (body as { path?: unknown }).path
      : null
  );
  if (!path) {
    return NextResponse.json({ ok: false, recorded: false }, { status: 400 });
  }

  let visitorId = request.cookies.get(ANALYTICS_VISITOR_COOKIE)?.value;
  if (!isValidVisitorId(visitorId)) {
    visitorId = newVisitorId();
  }

  const session = await getSession();
  const userId = session?.user?.id ?? null;

  try {
    const result = await recordPageView({
      path,
      visitorId,
      userId,
      ipHash: hashRequestIp(getRequestIp(request)),
    });

    const response = NextResponse.json({ ok: true, recorded: result.recorded });
    response.cookies.set(ANALYTICS_VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Error recording page view:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
