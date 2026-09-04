export enum DecisionType {
  PROMOTION = 'promotion',
  REFUND_POLICY = 'refund_policy',
  PRICING = 'pricing',
  INVENTORY = 'inventory',
  ADVERTISING = 'advertising',
  SHIPPING = 'shipping',
  SUPPLIER_PAYMENT = 'supplier_payment',
  LOSS_ANALYSIS = 'loss_analysis',
  CASH_PRESSURE = 'cash_pressure',
  CUSTOM = 'custom'
}

export enum Objective {
  MAXIMIZE_PROFIT = 'maximize_profit',
  INCREASE_REVENUE = 'increase_revenue',
  PROTECT_LIQUIDITY = 'protect_liquidity',
  REDUCE_LOSS = 'reduce_loss',
  REDUCE_REFUND_RISK = 'reduce_refund_risk',
  ACCELERATE_GROWTH = 'accelerate_growth',
  CLEAR_INVENTORY = 'clear_inventory',
  IMPROVE_ROI = 'improve_roi',
  BALANCED = 'balanced'
}

export enum ScenarioStatus {
  ELIGIBLE = 'ELIGIBLE',
  REJECTED = 'REJECTED',
  RECOMMENDED = 'RECOMMENDED',
  CAUTION = 'CAUTION'
}

export enum ConstraintRule {
  MIN_CASH = 'min_cash',
  MIN_MARGIN_PCT = 'min_margin_pct',
  MAX_DISCOUNT_PCT = 'max_discount_pct',
  MAX_CAMPAIGN_BUDGET = 'max_campaign_budget',
  MAX_REFUND_RATE_PCT = 'max_refund_rate_pct'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum EvidenceConfidence {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum DataSource {
  HISTORICAL_DATA = 'Historical merchant data',
  MERCHANT_ASSUMPTION = 'Merchant-provided assumption',
  SYNTHETIC_DATA = 'Synthetic test data',
  DERIVED_CALCULATION = 'Derived calculation',
  INSUFFICIENT_EVIDENCE = 'Insufficient evidence'
}

export enum PaymentStatus {
  CREATED = 'created',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  UNKNOWN = 'unknown'
}

export enum WebhookProcessStatus {
  RECEIVED = 'RECEIVED',
  VERIFIED = 'VERIFIED',
  PROCESSED = 'PROCESSED',
  DUPLICATE = 'DUPLICATE',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  RECONCILED = 'RECONCILED',
  FAILED_SAFE = 'FAILED_SAFE'
}
