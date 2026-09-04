import { z } from 'zod';
import {
  CandidateActionSchema,
  ConstraintConfigSchema,
  StructuredDecisionObjectSchema,
  MerchantProfileSchema,
  ScenarioSimulationInputSchema,
  ConstraintCheckResultSchema,
  ScenarioSimulationOutputSchema,
  AlternativeExplanationSchema,
  RecommendationOutputSchema,
  DecisionEntitySchema,
  RazorpayWebhookPayloadSchema
} from './schemas';

export type CandidateAction = z.infer<typeof CandidateActionSchema>;
export type ConstraintConfig = z.infer<typeof ConstraintConfigSchema>;
export type StructuredDecisionObject = z.infer<typeof StructuredDecisionObjectSchema>;
export type MerchantProfile = z.infer<typeof MerchantProfileSchema>;
export type ScenarioSimulationInput = z.infer<typeof ScenarioSimulationInputSchema>;
export type ConstraintCheckResult = z.infer<typeof ConstraintCheckResultSchema>;
export type ScenarioSimulationOutput = z.infer<typeof ScenarioSimulationOutputSchema>;
export type AlternativeExplanation = z.infer<typeof AlternativeExplanationSchema>;
export type RecommendationOutput = z.infer<typeof RecommendationOutputSchema>;
export type DecisionEntity = z.infer<typeof DecisionEntitySchema>;
export type RazorpayWebhookPayload = z.infer<typeof RazorpayWebhookPayloadSchema>;

export type TimeframeOption = '1M' | '3M' | '6M' | '12M';

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  stock_units: number;
  reorder_threshold: number;
  unit_cost_paise: number;
  selling_price_paise: number;
  margin_pct: number;
  margin_tier: 'HIGH' | 'MEDIUM' | 'LOW';
  days_inventory_left: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCKED';
}

export interface InventorySummary {
  total_units: number;
  total_valuation_paise: number;
  low_stock_items_count: number;
  stock_to_sales_ratio: number;
  turnover_ratio: number;
  items: InventoryItem[];
}

export interface TimeframeFinancialReport {
  timeframe: TimeframeOption;
  period_label: string;
  months_count: number;
  orders_count: number;
  gross_revenue_paise: number;
  discount_given_paise: number;
  net_revenue_paise: number;
  cogs_paise: number;
  variable_shipping_paise: number;
  gateway_fees_paise: number;
  ad_spend_paise: number;
  fixed_expenses_paise: number;
  gross_profit_paise: number;
  contribution_profit_paise: number;
  net_profit_paise: number;
  profit_margin_pct: number;
  refund_rate_pct: number;
  refund_count: number;
  loss_breakdown: {
    refund_loss_paise: number;
    return_shipping_loss_paise: number;
    discounts_absorbed_paise: number;
    unproductive_ad_spend_paise: number;
    dead_stock_holding_cost_paise: number;
    total_avoidable_loss_paise: number;
  };
  monthly_trend: Array<{
    month: string;
    revenue_paise: number;
    profit_paise: number;
    loss_paise: number;
    orders: number;
    refund_rate_pct: number;
  }>;
  inventory: InventorySummary;
}

export interface DashboardSummary {
  merchant: MerchantProfile;
  selected_timeframe: TimeframeOption;
  report: TimeframeFinancialReport;
  metrics: {
    period_revenue_paise: number;
    period_profit_paise: number;
    period_loss_paise: number;
    current_cash_paise: number;
    total_stock_value_paise: number;
    total_stock_units: number;
    refund_rate_pct: number;
    total_expenses_paise: number;
    pending_settlement_paise: number;
    active_simulations_count: number;
    recent_decisions_count: number;
  };
  risks: Array<{
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
  }>;
  data_freshness: {
    last_synced_at: string;
    razorpay_connected: boolean;
    missing_data_fields: string[];
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

export interface VarianceComparison {
  metric: string;
  predicted_paise?: number;
  actual_paise?: number;
  predicted_value?: number;
  actual_value?: number;
  unit: 'paise' | 'percent';
  variance_pct: number;
  status: 'better' | 'worse' | 'neutral';
}
