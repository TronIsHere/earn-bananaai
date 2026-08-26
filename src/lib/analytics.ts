import "server-only";
import crypto from "crypto";
import mongoose from "mongoose";
import connectDB, { isMongoDuplicateKey } from "@/lib/mongodb";
import type { AnalyticsSummary } from "@/lib/analytics-types";
import EarnSubmission from "@/models/earn-submission";
import PageView from "@/models/page-view";
import User from "@/models/user";

export type {
  AnalyticsDailyRow,
  AnalyticsPathRow,
  AnalyticsSummary,
} from "@/lib/analytics-types";

const VISITOR_COOKIE = "earn_vid";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEDUP_MS = 20_000;
const MAX_VIEWS_PER_VISITOR_PER_HOUR = 120;
const DAILY_DAYS = 14;

let pageViewIndexesReady = false;

async function ensurePageViewIndexes() {
  if (pageViewIndexesReady) return;
  await PageView.syncIndexes();
  pageViewIndexesReady = true;
}

export const ANALYTICS_VISITOR_COOKIE = VISITOR_COOKIE;

export const PATH_LABELS: Record<string, string> = {
  "/": "داشبورد",
  "/posts": "پست‌ها",
  "/profile": "پروفایل",
  "/billing": "تاریخچه مالی",
  "/login": "ورود",
  "/help": "راهنما",
  "/rules": "قوانین",
};

export function isValidVisitorId(value: string | undefined | null): value is string {
  return Boolean(value && UUID_RE.test(value));
}

export function newVisitorId(): string {
  return crypto.randomUUID();
}

export function tehranDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDaysToKey(key: string, delta: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return date.toISOString().slice(0, 10);
}

export function sanitizeViewPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let path = raw.trim().split("?")[0]?.split("#")[0] ?? "";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) {
    return null;
  }
  if (path.length > 200) path = path.slice(0, 200);
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path.startsWith("/api") || path.startsWith("/admin") || path.startsWith("/_next")) {
    return null;
  }
  return path;
}

export function hashRequestIp(ip: string | null): string | null {
  if (!ip) return null;
  const secret =
    process.env.NEXTAUTH_SECRET || process.env.OTP_SECRET || "earn-analytics";
  return crypto.createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}

export function pathLabel(path: string): string {
  if (PATH_LABELS[path]) return PATH_LABELS[path];
  if (path.startsWith("/help")) return "راهنما";
  if (path.startsWith("/rules")) return "قوانین";
  return path;
}

export async function recordPageView(params: {
  path: string;
  visitorId: string;
  userId: string | null;
  ipHash: string | null;
}): Promise<{ recorded: boolean }> {
  const path = sanitizeViewPath(params.path);
  if (!path || !isValidVisitorId(params.visitorId)) {
    return { recorded: false };
  }

  await connectDB();
  await ensurePageViewIndexes();

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourlyCount = await PageView.countDocuments({
    visitorId: params.visitorId,
    createdAt: { $gte: hourAgo },
  });
  if (hourlyCount >= MAX_VIEWS_PER_VISITOR_PER_HOUR) {
    return { recorded: false };
  }

  const dedupBucket = Math.floor(Date.now() / DEDUP_MS);

  try {
    await PageView.create({
      visitorId: params.visitorId,
      userId:
        params.userId && mongoose.Types.ObjectId.isValid(params.userId)
          ? new mongoose.Types.ObjectId(params.userId)
          : null,
      path,
      dayKey: tehranDayKey(),
      dedupBucket,
      ipHash: params.ipHash,
    });
  } catch (error) {
    if (isMongoDuplicateKey(error)) return { recorded: false };
    throw error;
  }

  return { recorded: true };
}

type FacetCount = { n: number };
type FacetPath = { _id: string; views: number; uniqueCount: number };
type FacetDay = { _id: string; views: number; uniqueCount: number };

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  await connectDB();
  await ensurePageViewIndexes();

  const today = tehranDayKey();
  const dayKeys = Array.from({ length: DAILY_DAYS }, (_, index) =>
    addDaysToKey(today, index - (DAILY_DAYS - 1))
  );
  const rangeStart = dayKeys[0];

  const [facet, registeredUsers, submissions] = await Promise.all([
    PageView.aggregate<{
      allViews: FacetCount[];
      uniqueVisitors: FacetCount[];
      uniqueUsers: FacetCount[];
      todayViews: FacetCount[];
      todayUnique: FacetCount[];
      paths: FacetPath[];
      daily: FacetDay[];
    }>([
      {
        $facet: {
          allViews: [{ $count: "n" }],
          uniqueVisitors: [
            { $group: { _id: "$visitorId" } },
            { $count: "n" },
          ],
          uniqueUsers: [
            { $match: { userId: { $ne: null } } },
            { $group: { _id: "$userId" } },
            { $count: "n" },
          ],
          todayViews: [{ $match: { dayKey: today } }, { $count: "n" }],
          todayUnique: [
            { $match: { dayKey: today } },
            { $group: { _id: "$visitorId" } },
            { $count: "n" },
          ],
          paths: [
            {
              $group: {
                _id: "$path",
                views: { $sum: 1 },
                unique: { $addToSet: "$visitorId" },
              },
            },
            { $project: { views: 1, uniqueCount: { $size: "$unique" } } },
            { $sort: { views: -1 } },
            { $limit: 12 },
          ],
          daily: [
            { $match: { dayKey: { $gte: rangeStart } } },
            {
              $group: {
                _id: "$dayKey",
                views: { $sum: 1 },
                unique: { $addToSet: "$visitorId" },
              },
            },
            { $project: { views: 1, uniqueCount: { $size: "$unique" } } },
          ],
        },
      },
    ]),
    User.countDocuments(),
    EarnSubmission.countDocuments(),
  ]);

  const row = facet[0];
  const dailyByKey = new Map(
    (row?.daily ?? []).map((item) => [
      item._id,
      { views: item.views, uniqueVisitors: item.uniqueCount },
    ])
  );

  return {
    totals: {
      views: row?.allViews[0]?.n ?? 0,
      uniqueVisitors: row?.uniqueVisitors[0]?.n ?? 0,
      uniqueUsers: row?.uniqueUsers[0]?.n ?? 0,
      viewsToday: row?.todayViews[0]?.n ?? 0,
      uniqueVisitorsToday: row?.todayUnique[0]?.n ?? 0,
      registeredUsers,
      submissions,
    },
    daily: dayKeys.map((day) => ({
      day,
      views: dailyByKey.get(day)?.views ?? 0,
      uniqueVisitors: dailyByKey.get(day)?.uniqueVisitors ?? 0,
    })),
    paths: (row?.paths ?? []).map((item) => ({
      path: item._id,
      label: pathLabel(item._id),
      views: item.views,
      uniqueVisitors: item.uniqueCount,
    })),
  };
}
