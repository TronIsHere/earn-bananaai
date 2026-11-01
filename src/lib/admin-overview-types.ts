/** Queue counts behind the admin sidebar badges and the overview page. */
export interface AdminOverviewJson {
  verifications: { pending: number; overdue: number };
  review: { pending: number; overdue: number; dueSoon: number };
  day7: { waiting: number; withInsights: number };
  payouts: { pending: number; overdue: number; pendingAmount: number };
  campaigns: {
    active: number;
    draft: number;
    totalBudgetToman: number;
    spentBudgetToman: number;
  };
  generatedAt: string;
}
