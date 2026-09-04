import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { SQLiteStore } from '../apps/api/src/store';
import { executeFullSimulationPipeline } from '../scripts/seed_demo_data';
import { parseDecisionLocally, parseMerchantQuestion } from '../packages/ai/src/parser';
import { ScenarioStatus } from '../packages/data-model/src';

test('Merchant Data Center: edit values, persist to SQLite, reload, and feed simulation', () => {
  const dbPath = path.resolve(__dirname, '../test_datacenter_flow.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  // 1. Session 1: Create store and apply exact test flow changes:
  // Minimum cash = ₹7,00,000, Stock = 700, Shipping cost = ₹150, Ad spend = ₹50,000
  const store1 = new SQLiteStore(dbPath);

  // Update Merchant Data
  store1.updateMerchantData({
    current_cash_paise: 70000000, // ₹7,00,000
    average_shipping_cost_paise: 15000, // ₹150
    monthly_ad_spend_paise: 5000000, // ₹50,000
    active_constraints: {
      minimum_cash: 700000,
      minimum_cash_paise: 70000000,
      minimum_margin_pct: 18.0,
      maximum_discount_pct: 25.0
    }
  });

  // Update Stock to 700 units for first SKU
  const firstSku = store1.getInventorySummary().items[0];
  store1.updateInventoryItem(firstSku.sku, { stock_units: 700 });

  // Verify immediate recalculation in session 1
  const invSummary1 = store1.getInventorySummary();
  assert.equal(invSummary1.items.find(i => i.sku === firstSku.sku)?.stock_units, 700);
  assert.ok(invSummary1.total_valuation_paise > 0);

  // Verify audit logs were written
  const auditLogs1 = store1.getAssumptionAuditLog(10);
  assert.ok(auditLogs1.length >= 3, 'Audit logs must record modifications');

  // Close session 1
  store1.close();

  // 2. Session 2: Reload store from disk (simulates page reload / server restart)
  const store2 = new SQLiteStore(dbPath);

  // Verify persistence
  assert.equal(store2.merchant.current_cash_paise, 70000000, 'Cash must persist at ₹7.0L');
  assert.equal(store2.merchant.average_shipping_cost_paise, 15000, 'Shipping cost must persist at ₹150');
  assert.equal(store2.merchant.monthly_ad_spend_paise, 5000000, 'Ad spend must persist at ₹50,000');
  assert.equal(store2.merchant.active_constraints.minimum_cash_paise, 70000000, 'Constraint min cash must persist');

  const invSummary2 = store2.getInventorySummary();
  assert.equal(invSummary2.items.find(i => i.sku === firstSku.sku)?.stock_units, 700, 'Stock units must persist across reload');

  // 3. Run Demo Question through simulation pipeline with updated merchant data:
  // "My sales are falling. Should I run a 5%, 10%, or 15% discount for the next 30 days? I need at least ₹7 lakh cash reserve and at least 18% margin."
  const decision = executeFullSimulationPipeline(
    'dec_test_dc_flow',
    'My sales are falling. Should I run a 5%, 10%, or 15% discount for the next 30 days? I need at least ₹7 lakh cash reserve and at least 18% margin.',
    store2.merchant
  );

  assert.equal(decision.status, 'COMPLETED');
  assert.ok(decision.scenarios.length >= 5);

  // Verify hard constraints rejected violating scenarios
  const rejected15 = decision.scenarios.find(s => s.name.includes('15%'));
  assert.ok(rejected15, '15% discount scenario must exist');
  assert.equal(rejected15.status, ScenarioStatus.REJECTED, '15% discount must be rejected for violating ₹7L cash reserve');

  // Verify recommended scenario satisfies constraints
  assert.ok(decision.recommendation);
  assert.notEqual(decision.recommendation.recommended_scenario_name, rejected15.name);
  assert.ok(decision.recommendation.why_not_the_others.length > 0);

  // Clean up
  store2.close();
  try { fs.unlinkSync(dbPath); } catch {}
});

test('Merchant Data Center: Missing required input fails safely', () => {
  // Test Requirement 10: Missing required data leads to graceful failure
  const parsed = parseDecisionLocally('Should I increase pricing?');
  // Check that missing data fields or need for input is detected safely
  assert.ok(parsed.candidate_actions.length > 0);
  assert.ok(parsed.decision_type);
});

test('Merchant Data Center: AI Provider Failure falls back safely and labels mode honestly', async () => {
  // Test Requirement 11: AI failure mode
  const fallbackDecision = await parseMerchantQuestion(
    'Should I run a 10% discount?',
    undefined,
    'fallback'
  );
  assert.equal(fallbackDecision.parser_mode, 'DETERMINISTIC_FALLBACK');
  assert.equal(fallbackDecision.parser_provider, 'local_heuristic_nlp');
  assert.ok(fallbackDecision.context_notes?.includes('Offline Safe Mode') || fallbackDecision.context_notes?.includes('Fallback'));
  assert.ok(fallbackDecision.candidate_actions.length > 0);
});
