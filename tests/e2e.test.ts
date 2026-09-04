import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEED_MERCHANT,
  DEMO_PRESETS,
  executeFullSimulationPipeline
} from '../scripts/seed_demo_data';
import { ScenarioStatus, formatINR } from '../packages/data-model/src';

test('E2E Demo 1: Festive Discount Dilemma produces expected 5 scenarios and rejects 15%', () => {
  const preset = DEMO_PRESETS[0];
  const decision = executeFullSimulationPipeline('test_dec_demo1', preset.question, SEED_MERCHANT);

  assert.equal(decision.status, 'COMPLETED');
  assert.ok(decision.scenarios.length >= 4, 'Should generate at least 4 scenarios');

  // Verify Baseline scenario is present
  const baseline = decision.scenarios.find((s) => s.name.toLowerCase().includes('baseline') || s.name.toLowerCase().includes('no discount'));
  assert.ok(baseline, 'Baseline scenario should exist');
  assert.equal(baseline.status, ScenarioStatus.ELIGIBLE);

  // Verify 15% discount is REJECTED due to minimum cash reserve (< ₹7,00,000)
  const scen15 = decision.scenarios.find((s) => s.name.includes('15%'));
  assert.ok(scen15, '15% discount scenario should exist');
  assert.equal(scen15.status, ScenarioStatus.REJECTED, '15% scenario must be REJECTED by cash constraint');
  assert.ok(
    scen15.projected_minimum_cash_paise < SEED_MERCHANT.active_constraints.minimum_cash_paise!,
    'Projected min cash for 15% discount must be below ₹7L threshold'
  );

  // Verify 10% high-margin only is RECOMMENDED
  const winner = decision.recommendation?.recommended_scenario_id;
  assert.ok(winner, 'A winning scenario must be recommended');
  const winningScenario = decision.scenarios.find((s) => s.scenario_id === winner);
  assert.ok(winningScenario, 'Winning scenario must exist');
  assert.equal(winningScenario.status, ScenarioStatus.RECOMMENDED);
  assert.ok(
    winningScenario.name.toLowerCase().includes('high-margin'),
    'High-margin targeted discount should be recommended'
  );

  // Verify "Why Not The Others?" is populated
  assert.ok(decision.recommendation!.why_not_the_others.length >= 3);
  const why15 = decision.recommendation!.why_not_the_others.find((w) => w.scenario_name.includes('15%'));
  assert.ok(why15, '15% scenario must be in Why Not The Others');
  assert.equal(why15.status, ScenarioStatus.REJECTED);
  assert.ok(why15.reason_not_selected.includes('below your required safety reserve'));
});

test('E2E Demo 2: Refund problem generates policy and SKU interventions', () => {
  const preset = DEMO_PRESETS[1];
  const decision = executeFullSimulationPipeline('test_dec_demo2', preset.question, SEED_MERCHANT);

  assert.equal(decision.status, 'COMPLETED');
  assert.ok(decision.scenarios.some((s) => s.name.includes('7 Days')));
  assert.ok(decision.scenarios.some((s) => s.name.includes('Product Sizing')));
  assert.ok(decision.scenarios.some((s) => s.name.includes('Delist')));
  assert.ok(decision.recommendation?.recommended_scenario_id);
});

test('E2E Demo 3: Inventory bulk purchase decision evaluates liquidity buffer', () => {
  const preset = DEMO_PRESETS[2];
  const decision = executeFullSimulationPipeline('test_dec_demo3', preset.question, SEED_MERCHANT);

  assert.equal(decision.status, 'COMPLETED');
  assert.ok(decision.scenarios.some((s) => s.name.includes('400')));
  assert.ok(decision.scenarios.some((s) => s.name.includes('1,000')));
});

test('E2E Demo 4: Loss analysis breaks down margin drivers', () => {
  const preset = DEMO_PRESETS[3];
  const decision = executeFullSimulationPipeline('test_dec_demo4', preset.question, SEED_MERCHANT);

  assert.equal(decision.status, 'COMPLETED');
  assert.ok(decision.scenarios.length >= 3);
});

test('E2E Demo 5: Advertising spend evaluates scaling tiers', () => {
  const preset = DEMO_PRESETS[4];
  const decision = executeFullSimulationPipeline('test_dec_demo5', preset.question, SEED_MERCHANT);

  assert.equal(decision.status, 'COMPLETED');
  assert.ok(decision.scenarios.some((s) => s.name.includes('25,000') || s.name.includes('50,000')));
});

test('E2E Demo 6: Unproductive Ad Spend Loss Fix generates actionable loss-remediation scenarios', () => {
  const preset = DEMO_PRESETS[5];
  const decision = executeFullSimulationPipeline('test_dec_demo6', preset.question, SEED_MERCHANT);

  assert.equal(decision.status, 'COMPLETED');
  assert.ok(decision.scenarios.length >= 4);
  assert.ok(decision.scenarios.some((s) => s.name.toLowerCase().includes('halt') || s.name.toLowerCase().includes('underperforming')));
  assert.ok(decision.scenarios.some((s) => s.name.toLowerCase().includes('reallocate') || s.name.toLowerCase().includes('retargeting')));
  assert.ok(decision.scenarios.some((s) => s.name.toLowerCase().includes('high-margin')));
  assert.ok(decision.recommendation?.recommended_scenario_id);
  assert.ok(decision.recommendation?.why_not_the_others.length >= 3);
});
