import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rupeesToPaise,
  paiseToRupees,
  formatINR,
  calculatePercentagePaise,
  addPaise,
  subtractPaise,
  DataSource
} from '../../packages/data-model/src';
import { simulateScenario, computeInputsHash } from '../../packages/simulator/src';

test('Money utilities: integer paise precision and INR formatting', () => {
  assert.equal(rupeesToPaise(700000), 70000000);
  assert.equal(paiseToRupees(70000000), 700000);
  assert.equal(calculatePercentagePaise(1000000, 10), 100000); // 10% of ₹10,000 is ₹1,000
  assert.equal(addPaise(100, 200, 300), 600);
  assert.equal(subtractPaise(1000, 250, 150), 600);

  // Formatting tests
  const formattedStandard = formatINR(70000000);
  assert.equal(formattedStandard, '₹7,00,000');

  const formattedCompactLakh = formatINR(70000000, { compact: true });
  assert.equal(formattedCompactLakh, '₹7L');

  const formattedCompactCr = formatINR(1500000000, { compact: true });
  assert.equal(formattedCompactCr, '₹1.5Cr');
});

test('Deterministic Simulation Engine: calculates revenue, costs, and profit correctly', () => {
  const dummyBaseline = {
    id: 'merch_test',
    name: 'Test Merchant',
    currency: 'INR' as const,
    timezone: 'Asia/Kolkata',
    current_cash_paise: 80000000, // ₹8,00,000
    monthly_orders: 2000,
    average_order_value_paise: 200000, // ₹2,000 AOV
    historical_refund_rate_pct: 8.0,
    average_cogs_pct: 45.0,
    average_shipping_cost_paise: 8000, // ₹80
    payment_gateway_fee_bps: 236, // 2.36%
    monthly_fixed_expenses_paise: 50000000,
    active_constraints: {
      minimum_cash: 700000,
      minimum_cash_paise: 70000000
    }
  };

  const input = {
    scenario_id: 'scen_test_10pct',
    name: '10% Discount',
    action: {
      name: '10% Discount',
      type: 'discount' as const,
      value: 0.10,
      unit: 'percent' as const,
      target: 'all_products' as const
    },
    time_horizon_days: 30,
    baseline: dummyBaseline,
    assumptions: {
      demand_elasticity: 1.25,
      expected_order_volume_multiplier: 1.0,
      refund_rate_pct: 8.0,
      ad_spend_paise: 0,
      inventory_purchase_paise: 0,
      unit_cogs_reduction_pct: 0,
      shipping_cost_per_order_paise: 8000,
      is_high_margin_filter: false,
      high_margin_cogs_pct: 35
    },
    data_sources: {
      sales: DataSource.HISTORICAL_DATA
    }
  };

  const output = simulateScenario(input);

  // Assertions
  assert.ok(output.projected_orders > 2000, 'Orders should increase with 10% discount');
  assert.ok(output.discount_cost_paise > 0, 'Discount cost must be positive');
  assert.ok(output.net_revenue_paise < output.gross_merchandise_value_paise, 'Net revenue should equal GMV minus discount');
  assert.equal(output.net_revenue_paise, output.gross_merchandise_value_paise - output.discount_cost_paise);
  assert.ok(output.profit_margin_pct > 0, 'Profit margin should be positive');
  assert.ok(output.closing_cash_paise > 0, 'Closing cash should be calculated');
  assert.ok(output.projected_minimum_cash_paise <= output.opening_cash_paise, 'Minimum cash should track drawdown');

  // Reproducibility test
  const hash1 = computeInputsHash(input);
  const hash2 = computeInputsHash(input);
  assert.equal(hash1, hash2, 'Inputs hash must be strictly deterministic');
  assert.equal(output.inputs_hash, hash1);
});
