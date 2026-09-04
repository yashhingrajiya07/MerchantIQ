import {
  CandidateAction,
  StructuredDecisionObject,
  MerchantProfile,
  ScenarioSimulationInput,
  DataSource
} from '@merchantiq/data-model';

/**
 * Generates concrete ScenarioSimulationInputs from a structured decision problem and merchant baseline.
 */
export function generateScenarioInputs(
  decision: StructuredDecisionObject,
  baseline: MerchantProfile
): ScenarioSimulationInput[] {
  return decision.candidate_actions.map((action: CandidateAction, index: number) => {
    const scenario_id = `scen_${index + 1}_${action.type}_${Math.round(action.value * 100)}`;
    const isHighMargin = action.target === 'high_margin_only';

    // Tailored assumptions based on action type
    let elasticity = 1.25;
    let volumeMultiplier = 1.0;
    let refundRatePct = baseline.historical_refund_rate_pct;
    let adSpendPaise = 0;
    let inventoryPurchasePaise = 0;
    let unitCogsReductionPct = 0;
    let shippingCostPerOrderPaise = baseline.average_shipping_cost_paise;

    if (action.type === 'baseline') {
      volumeMultiplier = 1.0;
    } else if (action.type === 'discount' || action.type === 'coupon') {
      // Deeper discounts drive higher volume but have diminishing returns
      elasticity = action.value > 0.12 ? 1.4 : 1.25;
    } else if (action.type === 'return_policy') {
      if (action.name.includes('7 Days')) {
        // Tightening return window reduces refunds significantly (e.g. from 14% to 9%), slight drop in conversion
        refundRatePct = Math.max(5, baseline.historical_refund_rate_pct * 0.65);
        volumeMultiplier = 0.96; // 4% conversion friction
      } else if (action.name.includes('Product Sizing')) {
        // Improved info reduces refunds without conversion penalty
        refundRatePct = Math.max(5, baseline.historical_refund_rate_pct * 0.72);
        volumeMultiplier = 1.02;
        adSpendPaise = 1500000; // ₹15,000 one-off photography/sizing content cost
      } else if (action.name.includes('Delist')) {
        // Stopping worst SKU drops refund rate, but loses 8% of revenue
        refundRatePct = Math.max(5, baseline.historical_refund_rate_pct * 0.58);
        volumeMultiplier = 0.92;
      }
    } else if (action.type === 'inventory_order') {
      const units = action.value;
      const unitCostRupees = 750; // ₹750 standard wholesale cost
      inventoryPurchasePaise = units * unitCostRupees * 100;

      if (units >= 1000) {
        unitCogsReductionPct = 15;
        inventoryPurchasePaise = Math.round(inventoryPurchasePaise * 0.85);
      } else if (units >= 800) {
        unitCogsReductionPct = 10;
        inventoryPurchasePaise = Math.round(inventoryPurchasePaise * 0.90);
      } else if (units >= 600) {
        unitCogsReductionPct = 5;
        inventoryPurchasePaise = Math.round(inventoryPurchasePaise * 0.95);
      }
    } else if (action.type === 'ad_budget') {
      adSpendPaise = Math.round(action.value * 100);
    }

    return {
      scenario_id,
      name: action.name,
      action,
      time_horizon_days: decision.time_horizon_days,
      baseline,
      assumptions: {
        demand_elasticity: elasticity,
        expected_order_volume_multiplier: volumeMultiplier,
        refund_rate_pct: refundRatePct,
        ad_spend_paise: adSpendPaise,
        inventory_purchase_paise: inventoryPurchasePaise,
        unit_cogs_reduction_pct: unitCogsReductionPct,
        shipping_cost_per_order_paise: shippingCostPerOrderPaise,
        is_high_margin_filter: isHighMargin,
        high_margin_cogs_pct: 35
      },
      data_sources: {
        historical_sales: DataSource.HISTORICAL_DATA,
        product_cost: DataSource.HISTORICAL_DATA,
        refund_rate: DataSource.HISTORICAL_DATA,
        demand_elasticity: DataSource.DERIVED_CALCULATION,
        payment_fees: DataSource.HISTORICAL_DATA
      }
    };
  });
}
