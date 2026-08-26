export interface AnalyticsDailyRow {
  day: string;
  views: number;
  uniqueVisitors: number;
}

export interface AnalyticsPathRow {
  path: string;
  label: string;
  views: number;
  uniqueVisitors: number;
}

export interface AnalyticsSummary {
  totals: {
    views: number;
    uniqueVisitors: number;
    uniqueUsers: number;
    viewsToday: number;
    uniqueVisitorsToday: number;
    registeredUsers: number;
    submissions: number;
  };
  daily: AnalyticsDailyRow[];
  paths: AnalyticsPathRow[];
}
