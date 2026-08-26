import { NextRequest, NextResponse } from "next/server";
import { uploadProofScreenshot } from "@/lib/s3/upload";
import { requireSession } from "@/lib/session";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { error: "لطفاً ابتدا وارد حساب کاربری خود شوید" },
        { status: 401 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("413") || message.includes("too large")) {
        return NextResponse.json(
          {
            error:
              "حجم فایل خیلی بزرگ است. لطفاً فایلی کوچکتر از ۶ مگابایت انتخاب کنید.",
          },
          { status: 413 }
        );
      }
      throw error;
    }

    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "لطفاً یک عکس انتخاب کنید" },
        { status: 400 }
      );
    }

    const result = await uploadProofScreenshot(file, session.user.id);

    return NextResponse.json({
      success: true,
      message: "فایل با موفقیت آپلود شد",
      url: result.url,
      fileName: result.fileName,
    });
  } catch (error) {
    console.error("Proof upload error:", error);
    const message =
      error instanceof Error ? error.message : "خطا در آپلود عکس";
    const isValidation =
      message.includes("فرمت") ||
      message.includes("حجم") ||
      message.includes("کوچک") ||
      message.includes("HEIC") ||
      message.includes("فایل");

    return NextResponse.json(
      { error: message },
      { status: isValidation ? 400 : 500 }
    );
  }
}
