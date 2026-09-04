import {
  ConstraintConfig,
  ConstraintRule,
  ConstraintCheckResult,
  ScenarioSimulationOutput,
  CandidateAction,
  ScenarioStatus,
  formatINR
} from '@merchantiq/data-model';

/**
 * Evaluates all configured hard merchant constraints against a scenario's deterministic output.
 * If any hard constraint fails, marks the scenario as REJECTED with an exact explanation.
 */
export function evaluateHardConstraints(
  scenario: ScenarioSimulationOutput,
  action: CandidateAction,
  constraints: ConstraintConfig
): {
  checks: ConstraintCheckResult[];
  allPassed: boolean;
  status: ScenarioStatus;
  primaryRejectionReason?: string;
} {
  const checks: ConstraintCheckResult[] = [];
  let allPassed = true;
  let primaryRejectionReason: string | undefined;

  // 1. Minimum Cash Reserve Check (Hard Constraint)
  const minCashRequiredPaise = constraints.minimum_cash_paise !== undefined
    ? constraints.minimum_cash_paise
    : (constraints.minimum_cash !== undefined ? constraints.minimum_cash * 100 : undefined);

  if (minCashRequiredPaise !== undefined && minCashRequiredPaise > 0) {
    const actualMinCashPaise = scenario.projected_minimum_cash_paise;
    const passed = actualMinCashPaise >= minCashRequiredPaise;

    let violation_message: string | undefined;
    if (!passed) {
      const shortfallPaise = minCashRequiredPaise - actualMinCashPaise;
      violation_message = `Projected minimum cash of ${formatINR(actualMinCashPaise)} is ${formatINR(shortfallPaise)} below your required safety reserve of ${formatINR(minCashRequiredPaise)}.`;
      if (!primaryRejectionReason) primaryRejectionReason = violation_message;
      allPassed = false;
    }

    checks.push({
      rule: ConstraintRule.MIN_CASH,
      description: 'Minimum Cash Reserve Buffer',
      threshold: minCashRequiredPaise,
      actual_value: actualMinCashPaise,
      passed,
      violation_message
    });
  }

  // 2. Minimum Profit Margin Check (Hard Constraint)
  if (constraints.minimum_margin_pct !== undefined && constraints.minimum_margin_pct > 0) {
    const requiredMarginPct = constraints.minimum_margin_pct;
    const actualMarginPct = scenario.profit_margin_pct;
    const passed = actualMarginPct >= requiredMarginPct;

    let violation_message: string | undefined;
    if (!passed) {
      const deficitPct = (requiredMarginPct - actualMarginPct).toFixed(1);
      violation_message = `Projected margin of ${actualMarginPct}% is ${deficitPct}% below your minimum acceptable margin threshold of ${requiredMarginPct}%.`;
      if (!primaryRejectionReason) primaryRejectionReason = violation_message;
      allPassed = false;
    }

    checks.push({
      rule: ConstraintRule.MIN_MARGIN_PCT,
      description: 'Minimum Profit Margin Floor',
      threshold: `${requiredMarginPct}%`,
      actual_value: `${actualMarginPct}%`,
      passed,
      violation_message
    });
  }

  // 3. Maximum Discount Rate Check (Hard Constraint)
  if (constraints.maximum_discount_pct !== undefined && constraints.maximum_discount_pct > 0) {
    const maxDiscountPct = constraints.maximum_discount_pct;
    let actualDiscountPct = 0;
    if (action.type === 'discount' || action.type === 'coupon') {
      actualDiscountPct = action.value * 100;
    }
    const passed = actualDiscountPct <= maxDiscountPct;

    let violation_message: string | undefined;
    if (!passed) {
      violation_message = `Discount of ${actualDiscountPct}% exceeds your maximum allowed ceiling of ${maxDiscountPct}%.`;
      if (!primaryRejectionReason) primaryRejectionReason = violation_message;
      allPassed = false;
    }

    checks.push({
      rule: ConstraintRule.MAX_DISCOUNT_PCT,
      description: 'Maximum Discount Rate Ceiling',
      threshold: `${maxDiscountPct}%`,
      actual_value: `${actualDiscountPct}%`,
      passed,
      violation_message
    });
  }

  // 4. Maximum Campaign Budget Check
  const maxBudgetPaise = constraints.maximum_campaign_budget_paise !== undefined
    ? constraints.maximum_campaign_budget_paise
    : (constraints.maximum_campaign_budget !== undefined ? constraints.maximum_campaign_budget * 100 : undefined);

  if (maxBudgetPaise !== undefined && maxBudgetPaise > 0) {
    const actualBudgetPaise = scenario.ad_campaign_cost_paise;
    const passed = actualBudgetPaise <= maxBudgetPaise;

    let violation_message: string | undefined;
    if (!passed) {
      const overspendPaise = actualBudgetPaise - maxBudgetPaise;
      violation_message = `Campaign cost of ${formatINR(actualBudgetPaise)} exceeds budget limit by ${formatINR(overspendPaise)}.`;
      if (!primaryRejectionReason) primaryRejectionReason = violation_message;
      allPassed = false;
    }

    checks.push({
      rule: ConstraintRule.MAX_CAMPAIGN_BUDGET,
      description: 'Maximum Campaign Budget Limit',
      threshold: maxBudgetPaise,
      actual_value: actualBudgetPaise,
      passed,
      violation_message
    });
  }

  // 5. Maximum Refund Rate Check
  if (constraints.maximum_refund_rate_pct !== undefined && constraints.maximum_refund_rate_pct > 0) {
    const maxRefundRatePct = constraints.maximum_refund_rate_pct;
    const actualRefundRatePct = (scenario.expected_refund_loss_paise / Math.max(scenario.net_revenue_paise, 1)) * 100;
    const passed = actualRefundRatePct <= maxRefundRatePct;

    let violation_message: string | undefined;
    if (!passed) {
      violation_message = `Expected refund loss rate of ${actualRefundRatePct.toFixed(1)}% exceeds safety limit of ${maxRefundRatePct}%.`;
      if (!primaryRejectionReason) primaryRejectionReason = violation_message;
      allPassed = false;
    }

    checks.push({
      rule: ConstraintRule.MAX_REFUND_RATE_PCT,
      description: 'Maximum Refund Exposure Ceiling',
      threshold: `${maxRefundRatePct}%`,
      actual_value: `${actualRefundRatePct.toFixed(1)}%`,
      passed,
      violation_message
    });
  }

  const status = allPassed ? ScenarioStatus.ELIGIBLE : ScenarioStatus.REJECTED;

  return {
    checks,
    allPassed,
    status,
    primaryRejectionReason
  };
}
