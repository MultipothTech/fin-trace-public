/**
 * Types and Data Contracts for Overview Feature
 */

export interface OverviewStats {
    balance: number;
    income: number;
    expense: number;
    incomeTrend: number;
    expenseTrend: number;
    balanceTrend: number;
    categoryStats: Record<string, number>;
    monthlyStats: Record<string, number>;
}
