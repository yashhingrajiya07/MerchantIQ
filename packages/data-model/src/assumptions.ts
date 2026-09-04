export type AssumptionSource =
  | 'SYNTHETIC_DEMO'
  | 'MERCHANT_HISTORICAL'
  | 'MERCHANT_RULE'
  | 'RAZORPAY_TEST_MODE'
  | 'DERIVED_CALCULATION';

export interface ModelAssumption {
  key: string;
  name: string;
  value: number | string | boolean;
  unit: 'paise' | 'percent' | 'days' | 'count' | 'bps' | 'ratio';
  source: AssumptionSource;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  merchant_editable: boolean;
}

export const CENTRALIZED_DEMO_ASSUMPTIONS: Record<string, ModelAssumption> = {
  average_cogs_pct: {
    key: 'average_cogs_pct',
    name: 'Cost of Goods Sold (COGS)',
    value: 48.0,
    unit: 'percent',
    source: 'SYNTHETIC_DEMO',
    confidence: 'HIGH',
    description: 'Average baseline product manufacturing and procurement cost ratio across the catalog.',
    merchant_editable: true
  },
  high_margin_cogs_pct: {
    key: 'high_margin_cogs_pct',
    name: 'High-Margin SKU COGS',
    value: 35.0,
    unit: 'percent',
    source: 'SYNTHETIC_DEMO',
    confidence: 'HIGH',
    description: 'Cost ratio for premium occasion and festive wear with >60% gross margin.',
    merchant_editable: true
  },
  historical_refund_rate_pct: {
    key: 'historical_refund_rate_pct',
    name: 'Historical Refund Rate',
    value: 8.0,
    unit: 'percent',
    source: 'SYNTHETIC_DEMO',
    confidence: 'HIGH',
    description: 'Trailing return and refund rate based on historical order deliveries.',
    merchant_editable: true
  },
  average_shipping_cost_paise: {
    key: 'average_shipping_cost_paise',
    name: 'Average Forward Courier Freight',
    value: 9000,
    unit: 'paise',
    source: 'SYNTHETIC_DEMO',
    confidence: 'HIGH',
    description: 'Standard domestic express courier delivery fee per shipment (₹90).',
    merchant_editable: true
  },
  reverse_shipping_cost_paise: {
    key: 'reverse_shipping_cost_paise',
    name: 'Reverse Logistics Courier Fee',
    value: 7000,
    unit: 'paise',
    source: 'SYNTHETIC_DEMO',
    confidence: 'HIGH',
    description: 'Return shipment pickup and QC freight fee absorbed on customer returns (₹70).',
    merchant_editable: true
  },
  payment_gateway_fee_bps: {
    key: 'payment_gateway_fee_bps',
    name: 'Razorpay Gateway Fee',
    value: 236,
    unit: 'bps',
    source: 'RAZORPAY_TEST_MODE',
    confidence: 'HIGH',
    description: 'Standard payment processing rate of 2.00% + 18% GST = 2.36% (236 bps).',
    merchant_editable: false
  },
  settlement_delay_days: {
    key: 'settlement_delay_days',
    name: 'Razorpay Settlement Window',
    value: 2,
    unit: 'days',
    source: 'RAZORPAY_TEST_MODE',
    confidence: 'HIGH',
    description: 'Standard T+2 banking day settlement deposit into merchant bank account.',
    merchant_editable: false
  },
  discount_demand_elasticity: {
    key: 'discount_demand_elasticity',
    name: 'Discount Demand Elasticity',
    value: 1.2,
    unit: 'ratio',
    source: 'SYNTHETIC_DEMO',
    confidence: 'MEDIUM',
    description: 'Expected order volume uplift multiplier per percentage point of promotional discount.',
    merchant_editable: true
  }
};
