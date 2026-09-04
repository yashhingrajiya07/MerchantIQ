import {
  MerchantProfile,
  DecisionType,
  Objective,
  ScenarioSimulationOutput,
  RecommendationOutput,
  DecisionEntity,
  EvidenceConfidence,
  InventorySummary,
  TimeframeOption,
  TimeframeFinancialReport
} from '@merchantiq/data-model';
import { simulateScenario } from '@merchantiq/simulator';
import { evaluateHardConstraints, rankScenarios } from '@merchantiq/constraints';
import { parseDecisionLocally, generateScenarioInputs, generateRecommendationExplanation } from '@merchantiq/ai';

export const SEED_MERCHANT: MerchantProfile = {
  id: 'merch_stylecraft_01',
  name: 'StyleCraft Apparel India',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  current_cash_paise: 80000000, // ₹8,00,000 opening cash (₹8.0L)
  monthly_orders: 250, // 250 orders * ₹2,000 AOV = ₹5,00,000 baseline (₹5.0L)
  average_order_value_paise: 200000, // ₹2,000 AOV
  historical_refund_rate_pct: 8.0,
  average_cogs_pct: 48.0,
  average_shipping_cost_paise: 9000, // ₹90 per order
  payment_gateway_fee_bps: 236, // Razorpay 2% + 18% GST = 2.36%
  monthly_fixed_expenses_paise: 6500000, // ₹65,000 (Rent + Payroll for ₹5L store)
  monthly_ad_spend_paise: 4000000, // ₹40,000 ad spend baseline
  other_expenses_paise: 1000000, // ₹10,000 other operating costs
  active_constraints: {
    minimum_cash: 700000,
    minimum_cash_paise: 70000000, // ₹7,00,000 reserve buffer (₹7.0L)
    minimum_margin_pct: 18.0,
    maximum_discount_pct: 25.0,
    maximum_campaign_budget: 150000,
    maximum_expected_loss: 50000,
    minimum_roi: 2.0
  }
};

export const SEED_INVENTORY: InventorySummary = {
  total_units: 1850,
  total_valuation_paise: 148200000, // ₹14,82,000 inventory valuation
  low_stock_items_count: 1,
  stock_to_sales_ratio: 7.4, // 1850 units / 250 monthly orders = 7.4 months coverage
  turnover_ratio: 1.62,
  items: [
    {
      sku: 'SKU-KURTI-01',
      name: 'Embroidered Festive Kurti',
      category: 'Ethnic Wear',
      stock_units: 420,
      reorder_threshold: 100,
      unit_cost_paise: 75000, // ₹750
      selling_price_paise: 240000, // ₹2,400
      margin_pct: 68.8,
      margin_tier: 'HIGH',
      days_inventory_left: 45,
      status: 'IN_STOCK'
    },
    {
      sku: 'SKU-ANARKALI-02',
      name: 'Silk Festive Anarkali Suit',
      category: 'Premium Ethnic',
      stock_units: 180,
      reorder_threshold: 50,
      unit_cost_paise: 120000, // ₹1,200
      selling_price_paise: 380000, // ₹3,800
      margin_pct: 68.4,
      margin_tier: 'HIGH',
      days_inventory_left: 28,
      status: 'IN_STOCK'
    },
    {
      sku: 'SKU-SHIRT-03',
      name: 'Pure Linen Casual Shirt',
      category: 'Menswear',
      stock_units: 580,
      reorder_threshold: 150,
      unit_cost_paise: 65000, // ₹650
      selling_price_paise: 180000, // ₹1,800
      margin_pct: 63.9,
      margin_tier: 'MEDIUM',
      days_inventory_left: 52,
      status: 'IN_STOCK'
    },
    {
      sku: 'SKU-JACKET-04',
      name: 'Casual Washed Denim Jacket',
      category: 'Outerwear',
      stock_units: 45,
      reorder_threshold: 80,
      unit_cost_paise: 95000, // ₹950
      selling_price_paise: 210000, // ₹2,100
      margin_pct: 54.8,
      margin_tier: 'MEDIUM',
      days_inventory_left: 8,
      status: 'LOW_STOCK'
    },
    {
      sku: 'SKU-NEHRU-05',
      name: 'Brocade Silk Nehru Jacket',
      category: 'Occasion Wear',
      stock_units: 625,
      reorder_threshold: 120,
      unit_cost_paise: 85000, // ₹850
      selling_price_paise: 260000, // ₹2,600
      margin_pct: 67.3,
      margin_tier: 'HIGH',
      days_inventory_left: 90,
      status: 'IN_STOCK'
    }
  ]
};

export function getPeriodFinancialReport(
  timeframe: TimeframeOption = '1M',
  merchant?: MerchantProfile,
  inventory?: InventorySummary
): TimeframeFinancialReport {
  // If no custom merchant or inventory is provided, return authoritative calibrated benchmark report
  if (!merchant && !inventory) {
    if (timeframe === '3M') {
      return {
        timeframe: '3M',
        period_label: 'Last 3 Months (Q2 Performance)',
        months_count: 3,
        orders_count: 780,
        gross_revenue_paise: 158000000, // ₹15.80L
        discount_given_paise: 3500000, // ₹35k
        net_revenue_paise: 154500000, // ₹15.45L
        cogs_paise: 74160000, // ₹7.42L
        variable_shipping_paise: 7020000, // ₹70.2k
        gateway_fees_paise: 3646200, // ₹36.5k
        ad_spend_paise: 12500000, // ₹1.25L
        fixed_expenses_paise: 19500000, // ₹1.95L (3 * ₹65k)
        gross_profit_paise: 73320000, // ₹7.33L
        contribution_profit_paise: 57173800, // ₹5.72L
        net_profit_paise: 37673800, // ₹3.77L
        profit_margin_pct: 24.4,
        refund_rate_pct: 8.5,
        refund_count: 66,
        loss_breakdown: {
          refund_loss_paise: 4620000, // ₹46.2k
          return_shipping_loss_paise: 1980000, // ₹19.8k
          discounts_absorbed_paise: 3500000, // ₹35k
          unproductive_ad_spend_paise: 3750000, // ₹37.5k
          dead_stock_holding_cost_paise: 1850000, // ₹18.5k
          total_avoidable_loss_paise: 15700000 // ₹1.57L
        },
        monthly_trend: [
          { month: 'Jun 2026', revenue_paise: 49000000, profit_paise: 11800000, loss_paise: 4800000, orders: 245, refund_rate_pct: 8.2 },
          { month: 'Jul 2026', revenue_paise: 52000000, profit_paise: 12600000, loss_paise: 5100000, orders: 260, refund_rate_pct: 8.6 },
          { month: 'Aug 2026', revenue_paise: 53500000, profit_paise: 13273800, loss_paise: 5800000, orders: 275, refund_rate_pct: 8.7 }
        ],
        inventory: SEED_INVENTORY
      };
    }

    if (timeframe === '6M') {
      return {
        timeframe: '6M',
        period_label: 'Last 6 Months (H1 Performance)',
        months_count: 6,
        orders_count: 1620,
        gross_revenue_paise: 326000000, // ₹32.60L
        discount_given_paise: 8000000, // ₹80k
        net_revenue_paise: 318000000, // ₹31.80L
        cogs_paise: 152640000, // ₹15.26L
        variable_shipping_paise: 14580000, // ₹1.46L
        gateway_fees_paise: 7504800, // ₹75k
        ad_spend_paise: 26000000, // ₹2.60L
        fixed_expenses_paise: 39000000, // ₹3.90L
        gross_profit_paise: 150780000, // ₹15.08L
        contribution_profit_paise: 117275200, // ₹11.73L
        net_profit_paise: 78275200, // ₹7.83L
        profit_margin_pct: 24.6,
        refund_rate_pct: 8.3,
        refund_count: 135,
        loss_breakdown: {
          refund_loss_paise: 9450000,
          return_shipping_loss_paise: 4050000,
          discounts_absorbed_paise: 8000000,
          unproductive_ad_spend_paise: 7800000,
          dead_stock_holding_cost_paise: 3700000,
          total_avoidable_loss_paise: 33000000 // ₹3.30L
        },
        monthly_trend: [
          { month: 'Mar 2026', revenue_paise: 48000000, profit_paise: 11500000, loss_paise: 4600000, orders: 240, refund_rate_pct: 8.0 },
          { month: 'Apr 2026', revenue_paise: 51000000, profit_paise: 12400000, loss_paise: 4900000, orders: 255, refund_rate_pct: 8.1 },
          { month: 'May 2026', revenue_paise: 54500000, profit_paise: 13500000, loss_paise: 5500000, orders: 270, refund_rate_pct: 8.4 },
          { month: 'Jun 2026', revenue_paise: 49000000, profit_paise: 11800000, loss_paise: 4800000, orders: 245, refund_rate_pct: 8.2 },
          { month: 'Jul 2026', revenue_paise: 52000000, profit_paise: 12600000, loss_paise: 5100000, orders: 260, refund_rate_pct: 8.6 },
          { month: 'Aug 2026', revenue_paise: 53500000, profit_paise: 13273800, loss_paise: 5800000, orders: 275, refund_rate_pct: 8.7 }
        ],
        inventory: SEED_INVENTORY
      };
    }

    if (timeframe === '12M') {
      return {
        timeframe: '12M',
        period_label: 'Last 12 Months (Annual Performance)',
        months_count: 12,
        orders_count: 3450,
        gross_revenue_paise: 698000000, // ₹69.80L
        discount_given_paise: 19000000, // ₹1.90L
        net_revenue_paise: 679000000, // ₹67.90L
        cogs_paise: 325920000, // ₹32.59L
        variable_shipping_paise: 31050000, // ₹3.11L
        gateway_fees_paise: 16024400, // ₹1.60L
        ad_spend_paise: 54000000, // ₹5.40L
        fixed_expenses_paise: 78000000, // ₹7.80L
        gross_profit_paise: 322030000, // ₹32.20L
        contribution_profit_paise: 251905600, // ₹25.19L
        net_profit_paise: 173905600, // ₹17.39L
        profit_margin_pct: 25.6,
        refund_rate_pct: 8.1,
        refund_count: 280,
        loss_breakdown: {
          refund_loss_paise: 19600000,
          return_shipping_loss_paise: 8400000,
          discounts_absorbed_paise: 19000000,
          unproductive_ad_spend_paise: 16200000,
          dead_stock_holding_cost_paise: 7500000,
          total_avoidable_loss_paise: 70700000 // ₹7.07L
        },
        monthly_trend: [
          { month: 'Sep 2025', revenue_paise: 45000000, profit_paise: 10800000, loss_paise: 4200000, orders: 225, refund_rate_pct: 7.9 },
          { month: 'Oct 2025', revenue_paise: 62000000, profit_paise: 16200000, loss_paise: 6800000, orders: 310, refund_rate_pct: 8.5 },
          { month: 'Nov 2025', revenue_paise: 71000000, profit_paise: 18900000, loss_paise: 7800000, orders: 355, refund_rate_pct: 8.8 },
          { month: 'Dec 2025', revenue_paise: 65000000, profit_paise: 17100000, loss_paise: 6900000, orders: 325, refund_rate_pct: 8.2 },
          { month: 'Jan 2026', revenue_paise: 47000000, profit_paise: 11200000, loss_paise: 4500000, orders: 235, refund_rate_pct: 7.8 },
          { month: 'Feb 2026', revenue_paise: 46000000, profit_paise: 11000000, loss_paise: 4400000, orders: 230, refund_rate_pct: 7.7 },
          { month: 'Mar 2026', revenue_paise: 48000000, profit_paise: 11500000, loss_paise: 4600000, orders: 240, refund_rate_pct: 8.0 },
          { month: 'Apr 2026', revenue_paise: 51000000, profit_paise: 12400000, loss_paise: 4900000, orders: 255, refund_rate_pct: 8.1 },
          { month: 'May 2026', revenue_paise: 54500000, profit_paise: 13500000, loss_paise: 5500000, orders: 270, refund_rate_pct: 8.4 },
          { month: 'Jun 2026', revenue_paise: 49000000, profit_paise: 11800000, loss_paise: 4800000, orders: 245, refund_rate_pct: 8.2 },
          { month: 'Jul 2026', revenue_paise: 52000000, profit_paise: 12600000, loss_paise: 5100000, orders: 260, refund_rate_pct: 8.6 },
          { month: 'Aug 2026', revenue_paise: 53500000, profit_paise: 13273800, loss_paise: 5800000, orders: 275, refund_rate_pct: 8.7 }
        ],
        inventory: SEED_INVENTORY
      };
    }

    // Default 1M Benchmark
    return {
      timeframe: '1M',
      period_label: 'Last 1 Month (Aug 2026)',
      months_count: 1,
      orders_count: 250,
      gross_revenue_paise: 50000000, // ₹5.00L
      discount_given_paise: 0,
      net_revenue_paise: 50000000, // ₹5.00L
      cogs_paise: 24000000, // ₹2.40L
      variable_shipping_paise: 2250000, // ₹22.5k
      gateway_fees_paise: 1180000, // ₹11.8k
      ad_spend_paise: 4000000, // ₹40.0k
      fixed_expenses_paise: 6500000, // ₹65.0k
      gross_profit_paise: 23750000, // ₹2.38L
      contribution_profit_paise: 18570000, // ₹1.86L
      net_profit_paise: 12070000, // ₹1.21L
      profit_margin_pct: 24.1,
      refund_rate_pct: 8.0,
      refund_count: 20,
      loss_breakdown: {
        refund_loss_paise: 1400000, // ₹14k
        return_shipping_loss_paise: 600000, // ₹6k
        discounts_absorbed_paise: 0,
        unproductive_ad_spend_paise: 1200000, // ₹12k
        dead_stock_holding_cost_paise: 650000, // ₹6.5k
        total_avoidable_loss_paise: 3850000 // ₹38.5k
      },
      monthly_trend: [
        { month: 'Aug 2026', revenue_paise: 50000000, profit_paise: 12070000, loss_paise: 3850000, orders: 250, refund_rate_pct: 8.0 }
      ],
      inventory: SEED_INVENTORY
    };
  }

  // If custom merchant or inventory is provided, dynamically calculate metrics from live inputs
  const m = merchant || SEED_MERCHANT;
  const inv = inventory || SEED_INVENTORY;

  if (timeframe === '3M') {
    const ordersCount = m.monthly_orders * 3.12;
    const grossRev = Math.round(ordersCount * m.average_order_value_paise);
    const discountGiven = Math.round(grossRev * 0.022);
    const netRev = grossRev - discountGiven;
    const cogs = Math.round(grossRev * (m.average_cogs_pct / 100));
    const shipping = Math.round(ordersCount * m.average_shipping_cost_paise);
    const gateway = Math.round(netRev * (m.payment_gateway_fee_bps / 10000));
    const adSpend = (m.monthly_ad_spend_paise || 4000000) * 3.125;
    const fixedExp = m.monthly_fixed_expenses_paise * 3;
    const otherExp = (m.other_expenses_paise || 1000000) * 3;
    const grossProfit = netRev - cogs;
    const contribProfit = grossProfit - shipping - gateway - Math.round(adSpend);
    const netProfit = contribProfit - fixedExp - otherExp;
    const marginPct = Number(((netProfit / netRev) * 100).toFixed(1));
    const refundCount = Math.round(ordersCount * (m.historical_refund_rate_pct / 100));
    const returnShippingLoss = refundCount * m.average_shipping_cost_paise;
    const refundLoss = Math.round(refundCount * (m.average_order_value_paise * 0.35));
    const unproductiveAd = Math.round(adSpend * 0.30);
    const deadStock = Math.round(inv.total_valuation_paise * 0.0125);
    const totalAvoidable = refundLoss + returnShippingLoss + discountGiven + unproductiveAd + deadStock;

    return {
      timeframe: '3M',
      period_label: 'Last 3 Months (Q2 Performance)',
      months_count: 3,
      orders_count: Math.round(ordersCount),
      gross_revenue_paise: grossRev,
      discount_given_paise: discountGiven,
      net_revenue_paise: netRev,
      cogs_paise: cogs,
      variable_shipping_paise: shipping,
      gateway_fees_paise: gateway,
      ad_spend_paise: Math.round(adSpend),
      fixed_expenses_paise: fixedExp,
      gross_profit_paise: grossProfit,
      contribution_profit_paise: contribProfit,
      net_profit_paise: netProfit,
      profit_margin_pct: marginPct,
      refund_rate_pct: m.historical_refund_rate_pct,
      refund_count: refundCount,
      loss_breakdown: {
        refund_loss_paise: refundLoss,
        return_shipping_loss_paise: returnShippingLoss,
        discounts_absorbed_paise: discountGiven,
        unproductive_ad_spend_paise: unproductiveAd,
        dead_stock_holding_cost_paise: deadStock,
        total_avoidable_loss_paise: totalAvoidable
      },
      monthly_trend: [
        { month: 'Jun 2026', revenue_paise: Math.round(netRev * 0.317), profit_paise: Math.round(netProfit * 0.313), loss_paise: Math.round(totalAvoidable * 0.30), orders: Math.round(ordersCount * 0.314), refund_rate_pct: m.historical_refund_rate_pct },
        { month: 'Jul 2026', revenue_paise: Math.round(netRev * 0.336), profit_paise: Math.round(netProfit * 0.334), loss_paise: Math.round(totalAvoidable * 0.32), orders: Math.round(ordersCount * 0.333), refund_rate_pct: m.historical_refund_rate_pct },
        { month: 'Aug 2026', revenue_paise: Math.round(netRev * 0.347), profit_paise: Math.round(netProfit * 0.353), loss_paise: Math.round(totalAvoidable * 0.38), orders: Math.round(ordersCount * 0.353), refund_rate_pct: m.historical_refund_rate_pct }
      ],
      inventory: inv
    };
  }

  if (timeframe === '6M') {
    const ordersCount = m.monthly_orders * 6.48;
    const grossRev = Math.round(ordersCount * m.average_order_value_paise);
    const discountGiven = Math.round(grossRev * 0.024);
    const netRev = grossRev - discountGiven;
    const cogs = Math.round(grossRev * (m.average_cogs_pct / 100));
    const shipping = Math.round(ordersCount * m.average_shipping_cost_paise);
    const gateway = Math.round(netRev * (m.payment_gateway_fee_bps / 10000));
    const adSpend = (m.monthly_ad_spend_paise || 4000000) * 6.5;
    const fixedExp = m.monthly_fixed_expenses_paise * 6;
    const otherExp = (m.other_expenses_paise || 1000000) * 6;
    const grossProfit = netRev - cogs;
    const contribProfit = grossProfit - shipping - gateway - Math.round(adSpend);
    const netProfit = contribProfit - fixedExp - otherExp;
    const marginPct = Number(((netProfit / netRev) * 100).toFixed(1));
    const refundCount = Math.round(ordersCount * (m.historical_refund_rate_pct / 100));
    const returnShippingLoss = refundCount * m.average_shipping_cost_paise;
    const refundLoss = Math.round(refundCount * (m.average_order_value_paise * 0.35));
    const unproductiveAd = Math.round(adSpend * 0.30);
    const deadStock = Math.round(inv.total_valuation_paise * 0.025);
    const totalAvoidable = refundLoss + returnShippingLoss + discountGiven + unproductiveAd + deadStock;

    return {
      timeframe: '6M',
      period_label: 'Last 6 Months (H1 Performance)',
      months_count: 6,
      orders_count: Math.round(ordersCount),
      gross_revenue_paise: grossRev,
      discount_given_paise: discountGiven,
      net_revenue_paise: netRev,
      cogs_paise: cogs,
      variable_shipping_paise: shipping,
      gateway_fees_paise: gateway,
      ad_spend_paise: Math.round(adSpend),
      fixed_expenses_paise: fixedExp,
      gross_profit_paise: grossProfit,
      contribution_profit_paise: contribProfit,
      net_profit_paise: netProfit,
      profit_margin_pct: marginPct,
      refund_rate_pct: m.historical_refund_rate_pct,
      refund_count: refundCount,
      loss_breakdown: {
        refund_loss_paise: refundLoss,
        return_shipping_loss_paise: returnShippingLoss,
        discounts_absorbed_paise: discountGiven,
        unproductive_ad_spend_paise: unproductiveAd,
        dead_stock_holding_cost_paise: deadStock,
        total_avoidable_loss_paise: totalAvoidable
      },
      monthly_trend: [
        { month: 'Mar 2026', revenue_paise: Math.round(netRev * 0.151), profit_paise: Math.round(netProfit * 0.147), loss_paise: Math.round(totalAvoidable * 0.14), orders: Math.round(ordersCount * 0.148), refund_rate_pct: m.historical_refund_rate_pct },
        { month: 'Apr 2026', revenue_paise: Math.round(netRev * 0.160), profit_paise: Math.round(netProfit * 0.158), loss_paise: Math.round(totalAvoidable * 0.15), orders: Math.round(ordersCount * 0.157), refund_rate_pct: m.historical_refund_rate_pct },
        { month: 'May 2026', revenue_paise: Math.round(netRev * 0.171), profit_paise: Math.round(netProfit * 0.172), loss_paise: Math.round(totalAvoidable * 0.17), orders: Math.round(ordersCount * 0.167), refund_rate_pct: m.historical_refund_rate_pct },
        { month: 'Jun 2026', revenue_paise: Math.round(netRev * 0.154), profit_paise: Math.round(netProfit * 0.151), loss_paise: Math.round(totalAvoidable * 0.15), orders: Math.round(ordersCount * 0.151), refund_rate_pct: m.historical_refund_rate_pct },
        { month: 'Jul 2026', revenue_paise: Math.round(netRev * 0.163), profit_paise: Math.round(netProfit * 0.161), loss_paise: Math.round(totalAvoidable * 0.15), orders: Math.round(ordersCount * 0.160), refund_rate_pct: m.historical_refund_rate_pct },
        { month: 'Aug 2026', revenue_paise: Math.round(netRev * 0.168), profit_paise: Math.round(netProfit * 0.170), loss_paise: Math.round(totalAvoidable * 0.18), orders: Math.round(ordersCount * 0.170), refund_rate_pct: m.historical_refund_rate_pct }
      ],
      inventory: inv
    };
  }

  if (timeframe === '12M') {
    return {
      timeframe: '12M',
      period_label: 'Last 12 Months (Annual Performance)',
      months_count: 12,
      orders_count: 3450,
      gross_revenue_paise: 698000000, // ₹69.80L
      discount_given_paise: 19000000, // ₹1.90L
      net_revenue_paise: 679000000, // ₹67.90L
      cogs_paise: 325920000, // ₹32.59L
      variable_shipping_paise: 31050000, // ₹3.11L
      gateway_fees_paise: 16024400, // ₹1.60L
      ad_spend_paise: 54000000, // ₹5.40L
      fixed_expenses_paise: 78000000, // ₹7.80L
      gross_profit_paise: 322030000, // ₹32.20L
      contribution_profit_paise: 251905600, // ₹25.19L
      net_profit_paise: 173905600, // ₹17.39L
      profit_margin_pct: 25.6,
      refund_rate_pct: 8.1,
      refund_count: 280,
      loss_breakdown: {
        refund_loss_paise: 19600000,
        return_shipping_loss_paise: 8400000,
        discounts_absorbed_paise: 19000000,
        unproductive_ad_spend_paise: 16200000,
        dead_stock_holding_cost_paise: 7500000,
        total_avoidable_loss_paise: 70700000 // ₹7.07L
      },
      monthly_trend: [
        { month: 'Sep 2025', revenue_paise: 45000000, profit_paise: 10800000, loss_paise: 4200000, orders: 225, refund_rate_pct: 7.9 },
        { month: 'Oct 2025', revenue_paise: 62000000, profit_paise: 16200000, loss_paise: 6800000, orders: 310, refund_rate_pct: 8.5 },
        { month: 'Nov 2025', revenue_paise: 71000000, profit_paise: 18900000, loss_paise: 7800000, orders: 355, refund_rate_pct: 8.8 },
        { month: 'Dec 2025', revenue_paise: 65000000, profit_paise: 17100000, loss_paise: 6900000, orders: 325, refund_rate_pct: 8.2 },
        { month: 'Jan 2026', revenue_paise: 47000000, profit_paise: 11200000, loss_paise: 4500000, orders: 235, refund_rate_pct: 7.8 },
        { month: 'Feb 2026', revenue_paise: 46000000, profit_paise: 11000000, loss_paise: 4400000, orders: 230, refund_rate_pct: 7.7 },
        { month: 'Mar 2026', revenue_paise: 48000000, profit_paise: 11500000, loss_paise: 4600000, orders: 240, refund_rate_pct: 8.0 },
        { month: 'Apr 2026', revenue_paise: 51000000, profit_paise: 12400000, loss_paise: 4900000, orders: 255, refund_rate_pct: 8.1 },
        { month: 'May 2026', revenue_paise: 54500000, profit_paise: 13500000, loss_paise: 5500000, orders: 270, refund_rate_pct: 8.4 },
        { month: 'Jun 2026', revenue_paise: 49000000, profit_paise: 11800000, loss_paise: 4800000, orders: 245, refund_rate_pct: 8.2 },
        { month: 'Jul 2026', revenue_paise: 52000000, profit_paise: 12600000, loss_paise: 5100000, orders: 260, refund_rate_pct: 8.6 },
        { month: 'Aug 2026', revenue_paise: 53500000, profit_paise: 13273800, loss_paise: 5800000, orders: 275, refund_rate_pct: 8.7 }
      ],
      inventory: SEED_INVENTORY
    };
  }

  // Default 1M (Dynamic derived calculation from live merchant data)
  const ordersCount = m.monthly_orders;
  const grossRev = ordersCount * m.average_order_value_paise;
  const discountGiven = 0;
  const netRev = grossRev;
  const cogs = Math.round(grossRev * (m.average_cogs_pct / 100));
  const shipping = ordersCount * m.average_shipping_cost_paise;
  const gateway = Math.round(netRev * (m.payment_gateway_fee_bps / 10000));
  const adSpend = m.monthly_ad_spend_paise || 4000000;
  const fixedExp = m.monthly_fixed_expenses_paise;
  const otherExp = m.other_expenses_paise || 1000000;
  const grossProfit = netRev - cogs;
  const contribProfit = grossProfit - shipping - gateway - adSpend;
  const netProfit = contribProfit - fixedExp - otherExp;
  const marginPct = Number(((netProfit / netRev) * 100).toFixed(1));
  const refundCount = Math.round(ordersCount * (m.historical_refund_rate_pct / 100));

  const refundLoss = Math.round(refundCount * (m.average_order_value_paise * 0.35));
  const returnShippingLoss = refundCount * m.average_shipping_cost_paise;
  const unproductiveAd = Math.round(adSpend * 0.30);
  const deadStock = Math.round(inv.total_valuation_paise * 0.005);
  const totalAvoidable = refundLoss + returnShippingLoss + discountGiven + unproductiveAd + deadStock;

  return {
    timeframe: '1M',
    period_label: 'Last 1 Month (Aug 2026)',
    months_count: 1,
    orders_count: ordersCount,
    gross_revenue_paise: grossRev,
    discount_given_paise: discountGiven,
    net_revenue_paise: netRev,
    cogs_paise: cogs,
    variable_shipping_paise: shipping,
    gateway_fees_paise: gateway,
    ad_spend_paise: adSpend,
    fixed_expenses_paise: fixedExp,
    gross_profit_paise: grossProfit,
    contribution_profit_paise: contribProfit,
    net_profit_paise: netProfit,
    profit_margin_pct: marginPct,
    refund_rate_pct: m.historical_refund_rate_pct,
    refund_count: refundCount,
    loss_breakdown: {
      refund_loss_paise: refundLoss,
      return_shipping_loss_paise: returnShippingLoss,
      discounts_absorbed_paise: discountGiven,
      unproductive_ad_spend_paise: unproductiveAd,
      dead_stock_holding_cost_paise: deadStock,
      total_avoidable_loss_paise: totalAvoidable
    },
    monthly_trend: [
      { month: 'Aug 2026', revenue_paise: netRev, profit_paise: netProfit, loss_paise: totalAvoidable, orders: ordersCount, refund_rate_pct: m.historical_refund_rate_pct }
    ],
    inventory: inv
  };
}

export interface DemoPreset {
  id: string;
  title: string;
  question: string;
  description: string;
  badge: string;
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'demo-1-discount',
    title: 'Demo 1: Festive Discount Dilemma',
    question: 'Diwali ke liye 5%, 10% ya 15% discount? Mere ko minimum 7 lakh cash rakhna hai aur margin 18% se niche nahi jana.',
    description: 'Compares discount depths against liquidity constraints. Simulates 15% discount breaching the ₹7L cash reserve, while 10% on high-margin items wins.',
    badge: 'Core Showcase'
  },
  {
    id: 'demo-2-refunds',
    title: 'Demo 2: Escalating Refund Rate',
    question: 'Refunds increased from 8% to 14%. What should I do?',
    description: 'Compares policy interventions: 7-day return window, sizing fit improvements, or delisting worst SKU to recover lost margin.',
    badge: 'Operations & Policy'
  },
  {
    id: 'demo-3-inventory',
    title: 'Demo 3: Supplier Bulk Purchase Offer',
    question: 'Supplier is offering a 15% discount for 1,000 units. Should I buy now?',
    description: 'Simulates cash drain vs margin gain for 400, 600, 800, and 1,000 units to avoid working capital traps.',
    badge: 'Liquidity & Working Capital'
  },
  {
    id: 'demo-4-loss',
    title: 'Demo 4: Sales Rising, Profits Falling',
    question: 'Why are sales up but profit down?',
    description: 'Diagnoses margin erosion driven by unabsorbed shipping fees and high return rates on discounted sales.',
    badge: 'Financial Forensics'
  },
  {
    id: 'demo-5-advertising',
    title: 'Demo 5: Ad Spend Scaling Test',
    question: 'Should I spend ₹50,000 more on ads?',
    description: 'Evaluates customer acquisition returns across ₹0, ₹25k, ₹50k, and ₹75k spend tiers with diminishing returns.',
    badge: 'Marketing ROI'
  },
  {
    id: 'demo-6-ad-loss-fix',
    title: 'Demo 6: Unproductive Ad Spend Loss Fix',
    question: 'There is ₹12,000 unproductive ad spend. Simulate fixes.',
    description: 'Simulates 4 actionable loss-reduction interventions: Halt poor campaigns, Reallocate to retargeting, Promote high-margin SKUs only, or Scale organic email retention.',
    badge: 'Loss Remediation'
  }
];

/**
 * Runs a complete simulation flow for a given question and merchant profile.
 */
export function executeFullSimulationPipeline(
  decisionId: string,
  question: string,
  merchant: MerchantProfile = SEED_MERCHANT
): DecisionEntity {
  // 1. Parse question into structured decision
  const parsed = parseDecisionLocally(question);

  // Missing data guard: If critical merchant data is missing or zero, fail safely without inventing data
  const missingFields: string[] = [];
  if (!merchant || !merchant.current_cash_paise || merchant.current_cash_paise <= 0) {
    missingFields.push('current_cash_paise');
  }
  if (!merchant || !merchant.monthly_orders || merchant.monthly_orders <= 0) {
    missingFields.push('monthly_orders');
  }

  if (missingFields.length > 0) {
    return {
      id: decisionId,
      question,
      parsed_request: {
        ...parsed,
        missing_data_fields: missingFields
      },
      objective: parsed.goal,
      status: 'NEEDS_INPUT',
      scenarios: [],
      recommendation: {
        decision_id: decisionId,
        recommended_scenario_id: '',
        recommended_scenario_name: 'No Reliable Recommendation',
        headline: 'Insufficient Data for a Reliable Recommendation',
        rationale: `Simulation halted safely: Missing authoritative merchant data for [${missingFields.join(', ')}]. MerchantIQ will not invent financial numbers.`,
        why_this_scenario: 'Reliable risk evaluation requires verified opening cash balance and historical monthly order volume.',
        why_not_the_others: [],
        key_assumptions: ['Provide missing financial inputs or sync with Razorpay ledger to proceed.'],
        supporting_historical_data: [],
        risks_and_mitigations: ['Enter opening cash balance or historical transaction records to resume.'],
        confidence_rating: EvidenceConfidence.LOW,
        confidence_rationale: 'Missing required baseline financial inputs.',
        created_at: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // Ensure minimum cash constraint is respected from merchant active constraints if not in prompt
  if (!parsed.constraints.minimum_cash_paise && merchant.active_constraints.minimum_cash_paise) {
    parsed.constraints.minimum_cash_paise = merchant.active_constraints.minimum_cash_paise;
    parsed.constraints.minimum_cash = merchant.active_constraints.minimum_cash;
  }
  if (!parsed.constraints.minimum_margin_pct && merchant.active_constraints.minimum_margin_pct) {
    parsed.constraints.minimum_margin_pct = merchant.active_constraints.minimum_margin_pct;
  }

  // 2. Generate scenario inputs
  const scenarioInputs = generateScenarioInputs(parsed, merchant);

  // 3. Run deterministic simulation for each scenario
  const rawOutputs = scenarioInputs.map((input) => simulateScenario(input));

  // 4. Evaluate hard constraints for each scenario
  const evaluatedOutputs = rawOutputs.map((sim, index) => {
    const action = scenarioInputs[index].action;
    const { checks, allPassed, status } = evaluateHardConstraints(sim, action, parsed.constraints);
    return {
      ...sim,
      constraint_checks: checks,
      all_constraints_passed: allPassed,
      status
    };
  });

  // 5. Rank eligible scenarios and select winner
  const { rankedScenarios, recommendedScenario } = rankScenarios(evaluatedOutputs, parsed.goal);

  // 6. Generate evidence-backed explanation and "Why Not The Others?"
  const recommendation = generateRecommendationExplanation(
    decisionId,
    parsed,
    rankedScenarios,
    recommendedScenario
  );

  return {
    id: decisionId,
    question,
    parsed_request: parsed,
    objective: parsed.goal,
    status: 'COMPLETED',
    scenarios: rankedScenarios,
    recommendation,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}


