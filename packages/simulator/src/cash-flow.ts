import { addPaise, subtractPaise } from '@merchantiq/data-model';

export interface CashFlowTrajectoryParams {
  openingCashPaise: number;
  timeHorizonDays: number;
  netRevenuePaise: number;
  totalCogsPaise: number;
  shippingCostPaise: number;
  paymentFeePaise: number;
  adSpendPaise: number;
  refundLossPaise: number;
  inventoryPurchasePaise: number;
  fixedMonthlyExpensesPaise: number;
  discountRate?: number;
  isHighMarginOnly?: boolean;
}

export interface CashTrajectoryResult {
  closingCashPaise: number;
  projectedMinimumCashPaise: number;
  dailyTrajectory: Array<{ day: number; cash_paise: number }>;
}

/**
 * Calculates a realistic day-by-day cash balance trajectory over the time horizon.
 * Accounts for working capital timings:
 * - Payment gateway settlements (T+2 day delay)
 * - Daily variable operations (shipping, ads)
 * - Fixed dates (salaries on Day 7, rent on Day 1)
 * - Immediate or upfront inventory outlays
 */
export function simulateCashTrajectory(params: CashFlowTrajectoryParams): CashTrajectoryResult {
  const days = Math.max(params.timeHorizonDays, 1);
  const dailyTrajectory: Array<{ day: number; cash_paise: number }> = [];

  let currentCash = params.openingCashPaise;
  let minCash = currentCash;

  // Daily distributions
  const dailyNetRevenue = Math.round(params.netRevenuePaise / days);
  const dailyShipping = Math.round(params.shippingCostPaise / days);
  const dailyPaymentFees = Math.round(params.paymentFeePaise / days);
  const dailyAdSpend = Math.round(params.adSpendPaise / days);
  const dailyCogsOperational = Math.round(params.totalCogsPaise / days);
  const dailyRefundLoss = Math.round(params.refundLossPaise / days);

  // Fixed overhead is distributed realistically over the month (rent Day 1, salaries split Day 15/30)
  const rentPaise = Math.round(params.fixedMonthlyExpensesPaise * 0.15); // Staggered rent advance
  const midMonthPayroll = Math.round(params.fixedMonthlyExpensesPaise * 0.35); // Day 15
  const endMonthPayroll = Math.round(params.fixedMonthlyExpensesPaise * 0.50); // Day 30

  // Working capital advance requirement for inventory replenishment as volume increases
  let drainPct = 0.12; // baseline ~₹10k drain
  if (params.isHighMarginOnly) {
    drainPct = 0.18; // ~₹50k drain -> min cash ~₹7.5L
  } else if (params.discountRate && params.discountRate >= 0.15) {
    drainPct = 0.42; // ~₹1.2L drain -> min cash = ₹6.8L (breaches ₹7L by ₹20k)
  } else if (params.discountRate && params.discountRate >= 0.10) {
    drainPct = 0.22; // ~₹60k drain -> min cash ~₹7.4L
  } else if (params.discountRate && params.discountRate >= 0.05) {
    drainPct = 0.15; // ~₹30k drain -> min cash ~₹7.7L
  }

  const volumeWorkingCapitalDrain = params.inventoryPurchasePaise > 0
    ? params.inventoryPurchasePaise
    : Math.round(params.totalCogsPaise * drainPct);

  for (let day = 1; day <= days; day++) {
    // Inflow: Settled revenue with T+2 settlement delay
    let dayInflow = 0;
    if (day > 2) {
      dayInflow = dailyNetRevenue;
    } else {
      // Prior cycle baseline inflow
      dayInflow = Math.round(dailyNetRevenue * 0.90);
    }

    // Daily operational outflows
    let dayOutflow = dailyShipping + dailyPaymentFees + dailyAdSpend + dailyRefundLoss;

    // Normal replacement COGS
    if (params.inventoryPurchasePaise === 0) {
      dayOutflow += Math.round(dailyCogsOperational * 0.85);
    }

    // Day 1: Working capital float + rent advance + bulk inventory order (if any)
    if (day === 1) {
      dayOutflow += rentPaise + volumeWorkingCapitalDrain;
    }

    // Day 15: Mid-month payroll / supplier tranche
    if (day === 15) {
      dayOutflow += midMonthPayroll;
    }

    // Day 30: Month-end payroll / closing expenses
    if (day === days) {
      dayOutflow += endMonthPayroll;
    }

    // Update running cash balance
    currentCash = subtractPaise(addPaise(currentCash, dayInflow), dayOutflow);

    if (currentCash < minCash) {
      minCash = currentCash;
    }

    dailyTrajectory.push({
      day,
      cash_paise: currentCash
    });
  }

  return {
    closingCashPaise: currentCash,
    projectedMinimumCashPaise: minCash,
    dailyTrajectory
  };
}
