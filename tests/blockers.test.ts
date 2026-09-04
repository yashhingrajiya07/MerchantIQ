import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  parseDecisionLocally,
  parseMerchantQuestion
} from '../packages/ai/src';
import {
  CENTRALIZED_DEMO_ASSUMPTIONS
} from '../packages/data-model/src';
import {
  executeFullSimulationPipeline,
  SEED_MERCHANT
} from '../scripts/seed_demo_data';
import { SQLiteStore } from '../apps/api/src/store';

test('Blocker 1: Ambiguity detection on brief/ambiguous prompt', () => {
  const parsed = parseDecisionLocally('Give 20% coupon.');
  assert.equal(parsed.ambiguity_detected, true, 'Ambiguity should be detected');
  assert.equal(parsed.clarification_needed, true, 'Clarification should be flagged');
  assert.ok(parsed.clarification_prompt && parsed.clarification_prompt.includes('categories'), 'Clarification prompt should guide user');
});

test('Blocker 2: Missing required merchant data fails safely without inventing numbers', () => {
  // Pass incomplete merchant profile with 0 cash balance
  const incompleteMerchant = {
    ...SEED_MERCHANT,
    current_cash_paise: 0
  };

  const result = executeFullSimulationPipeline(
    'dec_missing_data_test',
    'Should I run a 10% discount?',
    incompleteMerchant
  );

  assert.equal(result.status, 'NEEDS_INPUT', 'Status must be NEEDS_INPUT');
  assert.equal(result.recommendation?.recommended_scenario_name, 'No Reliable Recommendation', 'Must not force a recommendation');
  assert.ok(result.parsed_request.missing_data_fields.includes('current_cash_paise'), 'Must identify missing cash balance');
  assert.equal(result.scenarios.length, 0, 'No scenarios should be fabricated');
});

test('Blocker 3: Centralized assumptions layer contains labeled and sourced parameters', () => {
  const cogs = CENTRALIZED_DEMO_ASSUMPTIONS.average_cogs_pct;
  assert.ok(cogs, 'COGS assumption must exist in centralized registry');
  assert.equal(cogs.source, 'SYNTHETIC_DEMO', 'COGS must be labeled as SYNTHETIC_DEMO');
  assert.equal(cogs.confidence, 'HIGH', 'Confidence rating must be HIGH');
  assert.equal(cogs.merchant_editable, true, 'Merchant should be able to configure COGS');

  const rzpFee = CENTRALIZED_DEMO_ASSUMPTIONS.payment_gateway_fee_bps;
  assert.ok(rzpFee, 'Razorpay fee must exist');
  assert.equal(rzpFee.source, 'RAZORPAY_TEST_MODE', 'Fee source must be RAZORPAY_TEST_MODE');
  assert.equal(rzpFee.value, 236, 'Fee must be 236 bps (2% + 18% GST)');
});

test('Blocker 4: SQLiteStore persists decisions and reloads across instances', () => {
  const testDbPath = path.resolve(__dirname, '../scratch_test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // 1. Create store instance and save a new decision
  const store1 = new SQLiteStore(testDbPath);
  const testDecision = executeFullSimulationPipeline('dec_sqlite_persistence_test', '10% discount test', SEED_MERCHANT);
  store1.saveDecision(testDecision);

  // 2. Open second store instance on the same SQLite file
  const store2 = new SQLiteStore(testDbPath);
  const loaded = store2.decisions.get('dec_sqlite_persistence_test');

  assert.ok(loaded, 'Decision must survive reload in new SQLiteStore instance');
  assert.equal(loaded.id, 'dec_sqlite_persistence_test');
  assert.ok(loaded.scenarios.length > 0, 'Scenarios must be preserved in SQLite');
  assert.equal(loaded.recommendation?.recommended_scenario_name, testDecision.recommendation?.recommended_scenario_name);

  // Clean up scratch DB
  try {
    fs.unlinkSync(testDbPath);
  } catch {}
});
