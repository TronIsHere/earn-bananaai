"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Share2, X } from "lucide-react";
import { brandCta, brandCtaGhost } from "@/lib/brand";
import { cn, formatDayMonth, formatToman } from "@/lib/utils";

/** Instagram story size, so creators can post it as-is. */
const CARD_W = 1080;
const CARD_H = 1920;

const LIME = "#d1fe17";
const INK = "#070808";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Shrinks the font until `text` fits `maxWidth`, for long amounts. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  startSize: number,
  maxWidth: number,
  family: string
) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 60 && ctx.measureText(text).width > maxWidth) {
    size -= 6;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

async function drawCard(
  canvas: HTMLCanvasElement,
  params: { amount: number; paidAt: string | null; handle: string | null }
) {
  // next/font gives the family a hashed name; read it back from the page.
  const family = getComputedStyle(document.body).fontFamily;
  await Promise.all([
    document.fonts.load(`700 120px ${family}`, "۰۱"),
    document.fonts.load(`400 40px ${family}`, "۰۱"),
  ]);
  const logo = await loadImage("/img/logo.jpeg").catch(() => null);

  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = CARD_W / 2;

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const glow = ctx.createRadialGradient(cx, 860, 40, cx, 860, 760);
  glow.addColorStop(0, "rgba(209, 254, 23, 0.30)");
  glow.addColorStop(0.55, "rgba(209, 254, 23, 0.07)");
  glow.addColorStop(1, "rgba(209, 254, 23, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Faint grid so it reads "AI / tech" without competing with the number.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= CARD_W; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CARD_H);
    ctx.stroke();
  }
  for (let y = 0; y <= CARD_H; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CARD_W, y);
    ctx.stroke();
  }

  // Brand row
  if (logo) {
    ctx.save();
    roundedRect(ctx, cx - 60, 200, 120, 120, 32);
    ctx.clip();
    ctx.drawImage(logo, cx - 60, 200, 120, 120);
    ctx.restore();
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 52px ${family}`;
  ctx.fillText("کمپین بنانا", cx, 390);

  // "Paid" pill
  ctx.font = `700 40px ${family}`;
  const pill = "✓  واریز شد";
  const pillW = ctx.measureText(pill).width + 96;
  roundedRect(ctx, cx - pillW / 2, 600, pillW, 92, 46);
  ctx.fillStyle = "rgba(209, 254, 23, 0.12)";
  ctx.fill();
  ctx.strokeStyle = "rgba(209, 254, 23, 0.45)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = LIME;
  ctx.fillText(pill, cx, 648);

  // The amount
  const amountText = formatToman(params.amount);
  fitFont(ctx, amountText, 700, 210, CARD_W - 140, family);
  ctx.shadowColor = "rgba(209, 254, 23, 0.55)";
  ctx.shadowBlur = 60;
  ctx.fillStyle = LIME;
  ctx.fillText(amountText, cx, 880);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `700 68px ${family}`;
  ctx.fillText("تومان", cx, 1050);

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = `400 44px ${family}`;
  ctx.fillText("درآمد من از ساخت ریل با هوش مصنوعی بنانا", cx, 1200);
  if (params.paidAt) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = `400 38px ${family}`;
    ctx.fillText(`واریز ${formatDayMonth(params.paidAt)}`, cx, 1272);
  }

  // Lime call-to-action band
  roundedRect(ctx, 90, 1500, CARD_W - 180, 210, 48);
  ctx.fillStyle = LIME;
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `700 54px ${family}`;
  ctx.fillText("تو هم ریل بساز، پول بگیر", cx, 1575);
  ctx.font = `600 40px ${family}`;
  ctx.fillText(window.location.host, cx, 1650);

  if (params.handle) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = `600 40px ${family}`;
    ctx.direction = "ltr";
    ctx.fillText(`@${params.handle}`, cx, 1800);
    ctx.direction = "rtl";
  }
}

export function PayoutShareCard({
  amount,
  paidAt,
  handle,
  onClose,
}: {
  amount: number;
  paidAt: string | null;
  handle: string | null;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    void drawCard(canvas, { amount, paidAt, handle }).then(() => {
      canvas.toBlob((png) => {
        if (!cancelled) setBlob(png);
      }, "image/png");
    });
    return () => {
      cancelled = true;
    };
  }, [amount, paidAt, handle]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fileName = `bananaai-payout-${amount}.png`;

  const download = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const share = async () => {
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    if (!navigator.canShare?.({ files: [file] })) {
      download();
      return;
    }
    setSharing(true);
    try {
      await navigator.share({ files: [file] });
    } catch {
      // Closing the share sheet rejects; nothing to do.
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="کارت اشتراک واریز"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full max-w-sm flex-col gap-4 rounded-3xl border border-white/10 bg-surface p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">به بقیه نشانش بده</h3>
            <p className="mt-0.5 text-xs text-white/45">
              مناسب استوری اینستاگرام
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex size-8 items-center justify-center rounded-full text-white/50 hover:bg-white/8 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative mx-auto min-h-0 max-w-full overflow-hidden rounded-2xl border border-white/8 bg-black">
          <canvas
            ref={canvasRef}
            className="block h-[60vh] w-auto max-w-full object-contain"
            style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
          />
          {!blob && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-brand" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!blob || sharing}
            onClick={() => void share()}
            className={cn(brandCta, "py-2.5 text-sm")}
          >
            {sharing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Share2 className="size-4" />
            )}
            اشتراک‌گذاری
          </button>
          <button
            type="button"
            disabled={!blob}
            onClick={download}
            className={cn(brandCtaGhost, "py-2.5 text-sm")}
          >
            <Download className="size-4" />
            دانلود عکس
          </button>
        </div>
      </div>
    </div>
  );
}
