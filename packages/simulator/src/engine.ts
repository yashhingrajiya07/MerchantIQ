import crypto from 'crypto';
import {
  ScenarioSimulationInput,
  ScenarioSimulationOutput,
  ScenarioStatus,
  RiskLevel,
  EvidenceConfidence,
  addPaise,
  subtractPaise,
  calculatePercentagePaise
} from '@merchantiq/data-model';
import { simulateCashTrajectory } from './cash-flow';

export const SIMULATION_ENGINE_VERSION = '1.0.0';

/**
 * Computes deterministic SHA-256 hash of input parameters for reproducibility auditing.
 */
export function computeInputsHash(input: ScenarioSimulationInput): string {
  const canonical = JSON.stringify({
    scenario_id: input.scenario_id,
    action: input.action,
    time_horizon_days: input.time_horizon_days,
    baseline: {
      monthly_orders: input.baseline.monthly_orders,
      aov: input.baseline.average_order_value_paise,
      refund_rate: input.baseline.historical_refund_rate_pct,
      cogs_pct: input.baseline.average_cogs_pct,
      cash: input.baseline.current_cash_paise
    },
    assumptions: input.assumptions
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Deterministic Financial Simulation Engine
 * Executes exact integer paise arithmetic for all business metrics.
 */
export function simulateScenario(input: ScenarioSimulationInput): ScenarioSimulationOutput {
  const { action, baseline, assumptions, time_horizon_days } = input;
  const horizonFactor = time_horizon_days / 30;

  // 1. Order Volume & Elasticity
  // Baseline orders scaled to the time horizon
  const baselinePeriodOrders = Math.round(baseline.monthly_orders * horizonFactor);
  
  let orderVolumeMultiplier = assumptions.expected_order_volume_multiplier;
  
  // If a discount is applied, factor in demand elasticity
  let discountRate = 0;
  if (action.type === 'discount' || action.type === 'coupon') {
    discountRate = action.value; // e.g. 0.05, 0.10, 0.15
    // Demand lift = 1 + (discount * elasticity)
    const elasticityLift = 1 + discountRate * assumptions.demand_elasticity;
    orderVolumeMultiplier *= elasticityLift;
  } else if (action.type === 'cashback') {
    // Cashback gives slightly lower immediate conversion than direct discount
    discountRate = action.value;
    const elasticityLift = 1 + discountRate * (assumptions.demand_elasticity * 0.75);
    orderVolumeMultiplier *= elasticityLift;
  } else if (action.type === 'ad_budget') {
    // Ad budget increases volume via paid acquisition
    const addedSpendRupees = action.value;
    // Estimated Customer Acquisition Cost (CAC) ~ ₹500
    const estNewOrders = Math.round(addedSpendRupees / 500);
    const adLiftRatio = (baselinePeriodOrders + estNewOrders) / Math.max(baselinePeriodOrders, 1);
    orderVolumeMultiplier *= adLiftRatio;
  } else if (action.type === 'price_change') {
    // Price change: e.g. +5% reduces volume by elasticity * 0.8
    const priceChangeRatio = action.value;
    const volumeChange = 1 - priceChangeRatio * 1.1;
    orderVolumeMultiplier *= Math.max(volumeChange, 0.5);
  }

  // When targeting high-margin only, the promo applies to a subset of orders (e.g. 65% of orders)
  const isHighMarginOnly = action.target === 'high_margin_only' || assumptions.is_high_margin_filter;
  if (isHighMarginOnly) {
    // Higher average order value or focused volume
    orderVolumeMultiplier = Math.max(1.0, orderVolumeMultiplier * 0.92);
  }

  const projected_orders = Math.max(1, Math.round(baselinePeriodOrders * orderVolumeMultiplier));

  // 2. Average Order Value & Gross Merchandise Value (GMV)
  let unitAOVPaise = baseline.average_order_value_paise;
  if (action.type === 'price_change') {
    unitAOVPaise = Math.round(unitAOVPaise * (1 + action.value));
  }

  const gross_merchandise_value_paise = projected_orders * unitAOVPaise;

  // 3. Discount Cost
  let discount_cost_paise = 0;
  if (action.type === 'discount' || action.type === 'coupon' || action.type === 'cashback') {
    if (isHighMarginOnly) {
      // Applied only to ~60% of merchandise value
      const eligibleGMV = Math.round(gross_merchandise_value_paise * 0.60);
      discount_cost_paise = Math.round(eligibleGMV * discountRate);
    } else {
      discount_cost_paise = Math.round(gross_merchandise_value_paise * discountRate);
    }
  }

  const net_revenue_paise = subtractPaise(gross_merchandise_value_paise, discount_cost_paise);

  // 4. Product Costs (COGS)
  // High-margin products have lower COGS % (e.g. 35% vs baseline 48%)
  let effectiveCogsPct = isHighMarginOnly ? assumptions.high_margin_cogs_pct : baseline.average_cogs_pct;
  if (assumptions.unit_cogs_reduction_pct > 0) {
    effectiveCogsPct *= (1 - assumptions.unit_cogs_reduction_pct / 100);
  }
  const cogs_paise = calculatePercentagePaise(gross_merchandise_value_paise, effectiveCogsPct);

  // 5. Variable Shipping Cost
  let perOrderShippingPaise = assumptions.shipping_cost_per_order_paise || baseline.average_shipping_cost_paise;
  if (action.type === 'shipping_rule' && action.parameters?.free_shipping) {
    // Merchant absorbs entire shipping
    perOrderShippingPaise = Math.round(perOrderShippingPaise * 1.1);
  }
  const shipping_cost_paise = projected_orders * perOrderShippingPaise;

  // 6. Payment Gateway Fee (Razorpay baseline 2.36% = 2% + 18% GST)
  const paymentGatewayBps = baseline.payment_gateway_fee_bps || 236;
  const payment_fee_paise = Math.round((net_revenue_paise * paymentGatewayBps) / 10000);

  // 7. Ad / Campaign Costs
  let ad_campaign_cost_paise = assumptions.ad_spend_paise || 0;
  if (action.type === 'ad_budget') {
    ad_campaign_cost_paise = addPaise(ad_campaign_cost_paise, Math.round(action.value * 100));
  }

  // 8. Total Variable Costs & Profit
  const total_variable_costs_paise = addPaise(cogs_paise, shipping_cost_paise, payment_fee_paise, ad_campaign_cost_paise);
  const gross_profit_paise = subtractPaise(net_revenue_paise, cogs_paise, shipping_cost_paise);
  const contribution_profit_paise = subtractPaise(gross_profit_paise, payment_fee_paise, ad_campaign_cost_paise);

  // Profit Margin % = (contribution profit / net revenue) * 100
  const profit_margin_pct = net_revenue_paise > 0
    ? Number(((contribution_profit_paise / net_revenue_paise) * 100).toFixed(2))
    : 0;

  // 9. Refund Exposure & Expected Loss
  const refundRate = assumptions.refund_rate_pct / 100;
  const expectedRefundOrders = Math.round(projected_orders * refundRate);
  const refund_exposure_paise = expectedRefundOrders * unitAOVPaise;
  // Merchant loses forward shipping + payment fee + restocking (approx 35% of order value)
  const expected_refund_loss_paise = Math.round(refund_exposure_paise * 0.35);

  // 10. Cash Flows & Liquidity Simulation
  const fixedPeriodExpenses = Math.round(baseline.monthly_fixed_expenses_paise * horizonFactor);
  const cash_inflows_paise = subtractPaise(net_revenue_paise, Math.round(refund_exposure_paise * 0.70));
  const cash_outflows_paise = addPaise(
    total_variable_costs_paise,
    fixedPeriodExpenses,
    assumptions.inventory_purchase_paise
  );
  const net_cash_change_paise = subtractPaise(cash_inflows_paise, cash_outflows_paise);

  // Dynamic Day-by-Day Cash Trajectory
  const cashTrajectory = simulateCashTrajectory({
    openingCashPaise: baseline.current_cash_paise,
    timeHorizonDays: time_horizon_days,
    netRevenuePaise: net_revenue_paise,
    totalCogsPaise: cogs_paise,
    shippingCostPaise: shipping_cost_paise,
    paymentFeePaise: payment_fee_paise,
    adSpendPaise: ad_campaign_cost_paise,
    refundLossPaise: expected_refund_loss_paise,
    inventoryPurchasePaise: assumptions.inventory_purchase_paise,
    fixedMonthlyExpensesPaise: baseline.monthly_fixed_expenses_paise,
    discountRate: discountRate,
    isHighMarginOnly: isHighMarginOnly
  });

  const opening_cash_paise = baseline.current_cash_paise;
  const projected_minimum_cash_paise = cashTrajectory.projectedMinimumCashPaise;
  const closing_cash_paise = cashTrajectory.closingCashPaise;

  // 11. Risk Analysis & Scoring
  const riskFactors: string[] = [];
  let riskPoints = 0;

  // Liquidity risk check
  const minCashRequired = baseline.active_constraints.minimum_cash_paise || 
    (baseline.active_constraints.minimum_cash ? baseline.active_constraints.minimum_cash * 100 : 0);
  
  if (minCashRequired > 0 && projected_minimum_cash_paise < minCashRequired) {
    riskPoints += 50;
    riskFactors.push(`Projected minimum cash breaches merchant safety buffer`);
  } else if (minCashRequired > 0 && projected_minimum_cash_paise < minCashRequired * 1.1) {
    riskPoints += 25;
    riskFactors.push(`Projected minimum cash is within 10% of minimum cash threshold`);
  }

  // Margin compression risk
  if (profit_margin_pct < 15) {
    riskPoints += 30;
    riskFactors.push(`Thin profit margin (${profit_margin_pct}%) leaves low shock absorption`);
  }

  // High refund risk
  if (assumptions.refund_rate_pct > 12) {
    riskPoints += 20;
    riskFactors.push(`Elevated refund rate of ${assumptions.refund_rate_pct}% magnifies inventory reverse-logistics cost`);
  }

  // Heavy ad dependency
  if (ad_campaign_cost_paise > net_revenue_paise * 0.25) {
    riskPoints += 20;
    riskFactors.push(`High customer acquisition cost relative to net revenue`);
  }

  const risk_score = Math.min(100, Math.max(5, riskPoints));
  let risk_level = RiskLevel.LOW;
  if (risk_score >= 65) risk_level = RiskLevel.HIGH;
  else if (risk_score >= 35) risk_level = RiskLevel.MEDIUM;

  // 12. 3-Point Estimate (Optimistic / Expected / Conservative)
  const three_point_estimates = {
    optimistic: {
      revenue_paise: Math.round(net_revenue_paise * 1.12),
      profit_paise: Math.round(contribution_profit_paise * 1.18),
      margin_pct: Number((profit_margin_pct * 1.05).toFixed(2)),
      min_cash_paise: Math.round(projected_minimum_cash_paise * 1.025)
    },
    expected: {
      revenue_paise: net_revenue_paise,
      profit_paise: contribution_profit_paise,
      margin_pct: profit_margin_pct,
      min_cash_paise: projected_minimum_cash_paise
    },
    conservative: {
      revenue_paise: Math.round(net_revenue_paise * 0.88),
      profit_paise: Math.round(contribution_profit_paise * 0.75),
      margin_pct: Number((profit_margin_pct * 0.85).toFixed(2)),
      min_cash_paise: Math.round(projected_minimum_cash_paise * 0.94)
    }
  };

  // 13. "What If I'm Wrong?" Sensitivity Matrix (+25%, +18%, +10%, +5%, 0%, -10%)
  const sensitivitySteps = [25, 18, 10, 5, 0, -10];
  const sensitivity_analysis = sensitivitySteps.map((step) => {
    const mult = 1 + step / 100;
    const sRev = Math.round(net_revenue_paise * mult);
    const sProfit = Math.round(contribution_profit_paise * (step >= 0 ? 1 + (step / 100) * 1.2 : 1 + (step / 100) * 1.4));
    const sCash = Math.round(projected_minimum_cash_paise * (step >= 0 ? 1 + (step / 100) * 0.25 : 1 + (step / 100) * 0.45));
    const sMargin = sRev > 0 ? Number(((sProfit / sRev) * 100).toFixed(2)) : 0;
    const isSafe = minCashRequired > 0 ? sCash >= minCashRequired : true;

    return {
      demand_lift_pct: step,
      projected_revenue_paise: sRev,
      projected_profit_paise: sProfit,
      projected_min_cash_paise: sCash,
      margin_pct: sMargin,
      status: isSafe ? ScenarioStatus.ELIGIBLE : ScenarioStatus.REJECTED
    };
  });

  // 14. Inputs Hash & Version
  const inputs_hash = computeInputsHash(input);

  return {
    scenario_id: input.scenario_id,
    name: input.name,
    projected_orders,
    gross_merchandise_value_paise,
    discount_cost_paise,
    net_revenue_paise,
    cogs_paise,
    shipping_cost_paise,
    payment_fee_paise,
    ad_campaign_cost_paise,
    total_variable_costs_paise,
    gross_profit_paise,
    contribution_profit_paise,
    profit_margin_pct,
    refund_exposure_paise,
    expected_refund_loss_paise,
    cash_inflows_paise,
    cash_outflows_paise,
    net_cash_change_paise,
    opening_cash_paise,
    projected_minimum_cash_paise,
    closing_cash_paise,
    cash_trajectory_days: cashTrajectory.dailyTrajectory,
    risk_level,
    risk_score,
    risk_factors: riskFactors,
    constraint_checks: [], // Will be filled by Constraint Engine
    all_constraints_passed: true,
    three_point_estimates,
    sensitivity_analysis,
    status: ScenarioStatus.ELIGIBLE,
    score: 0,
    confidence: EvidenceConfidence.HIGH,
    engine_version: SIMULATION_ENGINE_VERSION,
    inputs_hash
  };
}
