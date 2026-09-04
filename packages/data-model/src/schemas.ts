import { z } from 'zod';
import {
  DecisionType,
  Objective,
  ScenarioStatus,
  ConstraintRule,
  RiskLevel,
  EvidenceConfidence,
  DataSource,
  PaymentStatus,
  WebhookProcessStatus
} from './enums';

// -----------------------------------------------------------------------------
// Candidate Action Schema
// -----------------------------------------------------------------------------
export const CandidateActionSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.enum([
    'discount',
    'coupon',
    'cashback',
    'inventory_order',
    'price_change',
    'ad_budget',
    'return_policy',
    'shipping_rule',
    'baseline'
  ]),
  value: z.number().min(0), // Percentage (e.g. 0.10 for 10%) or absolute amount
  unit: z.enum(['percent', 'amount_inr', 'units', 'days']).default('percent'),
  target: z.enum(['all_products', 'high_margin_only', 'low_margin', 'specific_sku', 'general']).default('all_products'),
  description: z.string().optional(),
  parameters: z.record(z.any()).optional()
});

// -----------------------------------------------------------------------------
// Merchant Constraints Schema
// -----------------------------------------------------------------------------
export const ConstraintConfigSchema = z.object({
  minimum_cash: z.number().nonnegative().optional(), // In Rupees (e.g. 700000)
  minimum_cash_paise: z.number().int().nonnegative().optional(), // In Paise (e.g. 70000000)
  minimum_margin_pct: z.number().min(0).max(100).optional(),
  maximum_discount_pct: z.number().min(0).max(100).optional(),
  maximum_campaign_budget: z.number().nonnegative().optional(), // In Rupees
  maximum_campaign_budget_paise: z.number().int().nonnegative().optional(),
  maximum_refund_rate_pct: z.number().min(0).max(100).optional(),
  maximum_expected_loss: z.number().nonnegative().optional(), // In Rupees
  maximum_expected_loss_paise: z.number().int().nonnegative().optional(),
  minimum_roi: z.number().min(0).optional() // e.g. 2.5x
});

// -----------------------------------------------------------------------------
// Structured Decision Object (Parsed from natural language by AI or Fallback)
// -----------------------------------------------------------------------------
export const StructuredDecisionObjectSchema = z.object({
  decision_type: z.nativeEnum(DecisionType),
  goal: z.nativeEnum(Objective).default(Objective.MAXIMIZE_PROFIT),
  time_horizon_days: z.number().int().positive().default(30),
  candidate_actions: z.array(CandidateActionSchema).min(1),
  constraints: ConstraintConfigSchema,
  required_data: z.array(z.string()).default([]),
  missing_data_fields: z.array(z.string()).default([]),
  context_notes: z.string().optional(),
  clarification_needed: z.boolean().default(false),
  clarification_prompt: z.string().optional(),
  ambiguity_detected: z.boolean().default(false),
  parser_mode: z.enum(['AI_LLM', 'DETERMINISTIC_FALLBACK']).default('DETERMINISTIC_FALLBACK'),
  parser_provider: z.string().default('local_heuristic_nlp')
});

// -----------------------------------------------------------------------------
// Merchant Baseline & Historical Metrics
// -----------------------------------------------------------------------------
export const MerchantProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.literal('INR').default('INR'),
  timezone: z.string().default('Asia/Kolkata'),
  current_cash_paise: z.number().int(),
  monthly_orders: z.number().int().nonnegative(),
  average_order_value_paise: z.number().int().nonnegative(),
  historical_refund_rate_pct: z.number().min(0).max(100),
  average_cogs_pct: z.number().min(0).max(100), // Cost of goods sold %
  average_shipping_cost_paise: z.number().int().nonnegative(),
  payment_gateway_fee_bps: z.number().int().default(236), // 2.36% (2% + 18% GST)
  monthly_fixed_expenses_paise: z.number().int().nonnegative(), // Rent, salaries
  monthly_ad_spend_paise: z.number().int().nonnegative().default(4000000), // ₹40,000 ad spend baseline
  other_expenses_paise: z.number().int().nonnegative().default(1000000), // ₹10,000 other operating costs
  active_constraints: ConstraintConfigSchema
});

// -----------------------------------------------------------------------------
// Scenario Simulation Input (Deterministic Input)
// -----------------------------------------------------------------------------
export const ScenarioSimulationInputSchema = z.object({
  scenario_id: z.string(),
  name: z.string(),
  action: CandidateActionSchema,
  time_horizon_days: z.number().int().positive(),
  baseline: MerchantProfileSchema,
  // Overrides / Assumptions
  assumptions: z.object({
    demand_elasticity: z.number().default(1.2), // sales lift per discount %
    expected_order_volume_multiplier: z.number().default(1.0),
    refund_rate_pct: z.number().min(0).max(100),
    ad_spend_paise: z.number().int().nonnegative().default(0),
    inventory_purchase_paise: z.number().int().nonnegative().default(0),
    unit_cogs_reduction_pct: z.number().min(0).max(100).default(0),
    shipping_cost_per_order_paise: z.number().int().nonnegative(),
    is_high_margin_filter: z.boolean().default(false),
    high_margin_cogs_pct: z.number().min(0).max(100).default(35)
  }),
  data_sources: z.record(z.nativeEnum(DataSource))
});

// -----------------------------------------------------------------------------
// Constraint Check Result
// -----------------------------------------------------------------------------
export const ConstraintCheckResultSchema = z.object({
  rule: z.nativeEnum(ConstraintRule),
  description: z.string(),
  threshold: z.union([z.number(), z.string()]),
  actual_value: z.union([z.number(), z.string()]),
  passed: z.boolean(),
  violation_message: z.string().optional()
});

// -----------------------------------------------------------------------------
// Scenario Simulation Output (Deterministic Calculation Output)
// -----------------------------------------------------------------------------
export const ScenarioSimulationOutputSchema = z.object({
  scenario_id: z.string(),
  name: z.string(),
  projected_orders: z.number().int().nonnegative(),
  gross_merchandise_value_paise: z.number().int().nonnegative(),
  discount_cost_paise: z.number().int().nonnegative(),
  net_revenue_paise: z.number().int().nonnegative(),
  cogs_paise: z.number().int().nonnegative(),
  shipping_cost_paise: z.number().int().nonnegative(),
  payment_fee_paise: z.number().int().nonnegative(),
  ad_campaign_cost_paise: z.number().int().nonnegative(),
  total_variable_costs_paise: z.number().int().nonnegative(),
  gross_profit_paise: z.number().int(),
  contribution_profit_paise: z.number().int(),
  profit_margin_pct: z.number(),
  refund_exposure_paise: z.number().int().nonnegative(),
  expected_refund_loss_paise: z.number().int().nonnegative(),
  cash_inflows_paise: z.number().int(),
  cash_outflows_paise: z.number().int(),
  net_cash_change_paise: z.number().int(),
  opening_cash_paise: z.number().int(),
  projected_minimum_cash_paise: z.number().int(),
  closing_cash_paise: z.number().int(),
  cash_trajectory_days: z.array(
    z.object({
      day: z.number().int(),
      cash_paise: z.number().int()
    })
  ),
  risk_level: z.nativeEnum(RiskLevel),
  risk_score: z.number().min(0).max(100), // 0 is safe, 100 is high risk
  risk_factors: z.array(z.string()),
  constraint_checks: z.array(ConstraintCheckResultSchema),
  all_constraints_passed: z.boolean(),
  // 3-Point Estimate (Optimistic / Expected / Conservative)
  three_point_estimates: z.object({
    optimistic: z.object({
      revenue_paise: z.number().int(),
      profit_paise: z.number().int(),
      margin_pct: z.number(),
      min_cash_paise: z.number().int()
    }),
    expected: z.object({
      revenue_paise: z.number().int(),
      profit_paise: z.number().int(),
      margin_pct: z.number(),
      min_cash_paise: z.number().int()
    }),
    conservative: z.object({
      revenue_paise: z.number().int(),
      profit_paise: z.number().int(),
      margin_pct: z.number(),
      min_cash_paise: z.number().int()
    })
  }).optional(),

  // Transparent Decision Score Breakdown
  score_breakdown: z.object({
    profit_pts: z.number(), // max 40
    cash_safety_pts: z.number(), // max 25
    growth_pts: z.number(), // max 25
    risk_penalty: z.number(), // max 10
    total_score: z.number(), // max 100
    explanation: z.string()
  }).optional(),

  // "What If I'm Wrong?" Sensitivity Analysis Matrix
  sensitivity_analysis: z.array(
    z.object({
      demand_lift_pct: z.number(),
      projected_revenue_paise: z.number().int(),
      projected_profit_paise: z.number().int(),
      projected_min_cash_paise: z.number().int(),
      margin_pct: z.number(),
      status: z.nativeEnum(ScenarioStatus)
    })
  ).default([]),

  status: z.nativeEnum(ScenarioStatus),
  score: z.number().default(0),
  confidence: z.nativeEnum(EvidenceConfidence),
  engine_version: z.string(),
  inputs_hash: z.string()
});

// -----------------------------------------------------------------------------
// Recommendation & Explanation Schema
// -----------------------------------------------------------------------------
export const AlternativeExplanationSchema = z.object({
  scenario_id: z.string(),
  scenario_name: z.string(),
  status: z.nativeEnum(ScenarioStatus),
  reason_not_selected: z.string(),
  trade_off_summary: z.string()
});

export const RecommendationOutputSchema = z.object({
  decision_id: z.string(),
  recommended_scenario_id: z.string(),
  recommended_scenario_name: z.string(),
  headline: z.string(),
  rationale: z.string(),
  why_this_scenario: z.string(),
  why_not_the_others: z.array(AlternativeExplanationSchema),
  key_assumptions: z.array(z.string()),
  supporting_historical_data: z.array(z.string()),
  risks_and_mitigations: z.array(z.string()),
  confidence_rating: z.nativeEnum(EvidenceConfidence),
  confidence_rationale: z.string(),
  created_at: z.string()
});

// -----------------------------------------------------------------------------
// Decision Lifecycle Entity
// -----------------------------------------------------------------------------
export const DecisionEntitySchema = z.object({
  id: z.string(),
  question: z.string(),
  parsed_request: StructuredDecisionObjectSchema,
  objective: z.nativeEnum(Objective),
  status: z.enum(['DRAFT', 'VALIDATING', 'RUNNING', 'COMPLETED', 'NEEDS_INPUT', 'FAILED_SAFE']),
  scenarios: z.array(ScenarioSimulationOutputSchema).default([]),
  recommendation: RecommendationOutputSchema.optional(),
  actual_outcome: z
    .object({
      revenue_paise: z.number().int(),
      profit_paise: z.number().int(),
      cash_paise: z.number().int(),
      refund_rate_pct: z.number(),
      recorded_at: z.string(),
      notes: z.string().optional()
    })
    .optional(),
  created_at: z.string(),
  updated_at: z.string()
});

// -----------------------------------------------------------------------------
// Razorpay Webhook Event Schema
// -----------------------------------------------------------------------------
export const RazorpayWebhookPayloadSchema = z.object({
  event: z.string(),
  account_id: z.string().optional(),
  event_id: z.string(),
  contains: z.array(z.string()),
  payload: z.record(z.any()),
  created_at: z.number()
});
