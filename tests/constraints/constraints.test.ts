import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ScenarioStatus,
  Objective,
  RiskLevel,
  EvidenceConfidence
} from '../../packages/data-model/src';
import { evaluateHardConstraints, rankScenarios } from '../../packages/constraints/src';

test('Hard constraints: rejects scenarios violating minimum cash reserve', () => {
  const dummyScenario = {
    scenario_id: 'scen_15pct',
    name: '15% Storewide Discount',
    projected_orders: 2800,
    gross_merchandise_value_paise: 560000000,
    discount_cost_paise: 84000000,
    net_revenue_paise: 476000000,
    cogs_paise: 252000000,
    shipping_cost_paise: 22400000,
    payment_fee_paise: 11233600,
    ad_campaign_cost_paise: 0,
    total_variable_costs_paise: 285633600,
    gross_profit_paise: 201600000,
    contribution_profit_paise: 190366400,
    profit_margin_pct: 16.5,
    refund_exposure_paise: 44800000,
    expected_refund_loss_paise: 15680000,
    cash_inflows_paise: 444640000,
    cash_outflows_paise: 350633600,
    net_cash_change_paise: 94006400,
    opening_cash_paise: 80000000,
    projected_minimum_cash_paise: 68000000, // ₹6,80,000 (Violates ₹7,00,000)
    closing_cash_paise: 74000000,
    cash_trajectory_days: [],
    risk_level: RiskLevel.HIGH,
    risk_score: 70,
    risk_factors: ['Projected minimum cash breaches merchant safety buffer'],
    constraint_checks: [],
    all_constraints_passed: true,
    status: ScenarioStatus.ELIGIBLE,
    score: 0,
    confidence: EvidenceConfidence.HIGH,
    engine_version: '1.0.0',
    inputs_hash: 'test_hash'
  };

  const action = {
    name: '15% Storewide Discount',
    type: 'discount' as const,
    value: 0.15,
    unit: 'percent' as const,
    target: 'all_products' as const
  };

  const constraints = {
    minimum_cash: 700000,
    minimum_cash_paise: 70000000, // ₹7,00,000
    minimum_margin_pct: 18.0 // Requires 18% margin, actual is 16.5%
  };

  const evalResult = evaluateHardConstraints(dummyScenario, action, constraints);

  assert.equal(evalResult.allPassed, false);
  assert.equal(evalResult.status, ScenarioStatus.REJECTED);
  assert.ok(evalResult.primaryRejectionReason?.includes('below your required safety reserve'));
});

test('Scenario ranking: selects best scenario satisfying merchant objective', () => {
  const s1 = {
    scenario_id: 's1',
    name: 'Baseline',
    contribution_profit_paise: 12000000,
    projected_minimum_cash_paise: 79000000,
    net_revenue_paise: 50000000,
    risk_score: 15,
    all_constraints_passed: true,
    status: ScenarioStatus.ELIGIBLE
  } as any;

  const s2 = {
    scenario_id: 's2',
    name: '10% High-Margin Targeted',
    contribution_profit_paise: 14500000, // Highest profit
    projected_minimum_cash_paise: 75000000,
    net_revenue_paise: 61000000,
    risk_score: 25,
    all_constraints_passed: true,
    status: ScenarioStatus.ELIGIBLE
  } as any;

  const s3 = {
    scenario_id: 's3',
    name: '15% Storewide',
    contribution_profit_paise: 14200000,
    projected_minimum_cash_paise: 68000000,
    net_revenue_paise: 71000000,
    risk_score: 75,
    all_constraints_passed: false, // REJECTED
    status: ScenarioStatus.REJECTED
  } as any;

  const { rankedScenarios, recommendedScenario } = rankScenarios([s1, s2, s3], Objective.MAXIMIZE_PROFIT);

  assert.ok(recommendedScenario !== null);
  assert.equal(recommendedScenario.scenario_id, 's2', 'Scenario s2 should be recommended');
  assert.equal(recommendedScenario.status, ScenarioStatus.RECOMMENDED);

  // Verify s3 remains rejected
  const foundS3 = rankedScenarios.find((s) => s.scenario_id === 's3');
  assert.equal(foundS3?.status, ScenarioStatus.REJECTED);
});
