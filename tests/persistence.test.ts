import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { SQLiteStore } from '../apps/api/src/store';
import { executeFullSimulationPipeline, SEED_MERCHANT } from '../scripts/seed_demo_data';
import { Objective } from '../packages/data-model/src';

test('Database Persistence: survives restart for decisions, scenarios, assumptions, constraints, recommendations, outcomes, and audit events', () => {
  const dbFile = path.resolve(__dirname, '../test_persistence_verify.db');
  if (fs.existsSync(dbFile)) {
    fs.unlinkSync(dbFile);
  }

  // === SESSION 1: Create store, insert decision, outcome, audit event ===
  const storeSession1 = new SQLiteStore(dbFile);

  // 1. Merchant constraints
  storeSession1.merchant.active_constraints = {
    minimum_cash: 750000,
    minimum_cash_paise: 75000000,
    minimum_margin_pct: 22.0,
    maximum_discount_pct: 20.0
  };
  storeSession1.saveMerchant();

  // 2. Decision with scenarios, assumptions, constraints, and recommendation
  const testDecision = executeFullSimulationPipeline(
    'dec_persistence_full_test',
    'Should I run a 10% discount? Minimum cash 7.5L and margin 22%.',
    storeSession1.merchant
  );

  // 3. Actual outcome (Predicted vs Actual)
  testDecision.actual_outcome = {
    revenue_paise: 52000000, // ₹5.20L
    profit_paise: 13500000,  // ₹1.35L
    cash_paise: 76000000,    // ₹7.60L
    refund_rate_pct: 7.9,
    recorded_at: new Date().toISOString(),
    notes: 'Realized campaign numbers verified via Razorpay settlements.'
  };

  storeSession1.saveDecision(testDecision);

  // 4. Audit event
  storeSession1.recordAuditEvent(
    'evt_rzp_webhook_9999',
    'payment.captured',
    'PROCESSED',
    'Payment ₹2,000 captured for order_test_123',
    1
  );

  // Close session 1
  storeSession1.close();

  // === SESSION 2: Restart (Open brand new SQLiteStore pointing to the same db file) ===
  const storeSession2 = new SQLiteStore(dbFile);

  // 1. Verify merchant and constraints survived
  assert.equal(storeSession2.merchant.active_constraints.minimum_cash_paise, 75000000, 'Constraint minimum_cash_paise must survive restart');
  assert.equal(storeSession2.merchant.active_constraints.minimum_margin_pct, 22.0, 'Constraint minimum_margin_pct must survive restart');

  // 2. Verify decision survived
  const loadedDecision = storeSession2.decisions.get('dec_persistence_full_test');
  assert.ok(loadedDecision, 'Decision must survive restart');
  assert.equal(loadedDecision.id, 'dec_persistence_full_test');
  assert.equal(loadedDecision.status, 'COMPLETED');

  // 3. Verify scenarios survived
  assert.ok(loadedDecision.scenarios.length > 0, 'Scenarios must survive restart');
  const recScenario = loadedDecision.scenarios.find(s => s.status === 'RECOMMENDED');
  assert.ok(recScenario, 'Recommended scenario must be marked and preserved');
  assert.ok(recScenario.net_revenue_paise > 0, 'Scenario financial metrics must survive');

  // 4. Verify assumptions survived
  assert.ok(loadedDecision.recommendation?.key_assumptions && loadedDecision.recommendation.key_assumptions.length > 0, 'Key assumptions must survive');

  // 5. Verify constraints survived within the decision object
  assert.ok(loadedDecision.parsed_request.constraints.minimum_cash || loadedDecision.parsed_request.constraints.minimum_cash_paise, 'Constraints must survive');

  // 6. Verify recommendation and evidence survived
  assert.ok(loadedDecision.recommendation, 'Recommendation object must survive');
  assert.ok(loadedDecision.recommendation.why_not_the_others.length > 0, 'Recommendation alternative explanations must survive');
  assert.ok(loadedDecision.recommendation.key_assumptions.length > 0, 'Key assumptions must survive');
  assert.ok(loadedDecision.recommendation.risks_and_mitigations.length > 0, 'Risks and mitigations must survive');

  // 7. Verify actual outcome survived
  assert.ok(loadedDecision.actual_outcome, 'Actual outcome must survive restart');
  assert.equal(loadedDecision.actual_outcome.revenue_paise, 52000000);
  assert.equal(loadedDecision.actual_outcome.profit_paise, 13500000);
  assert.equal(loadedDecision.actual_outcome.notes, 'Realized campaign numbers verified via Razorpay settlements.');

  // 8. Verify audit event survived in SQLite
  const auditRow = storeSession2.db.prepare('SELECT * FROM audit_events WHERE event_id = ?').get('evt_rzp_webhook_9999') as any;
  assert.ok(auditRow, 'Audit event must survive in database');
  assert.equal(auditRow.event_type, 'payment.captured');
  assert.equal(auditRow.status, 'PROCESSED');
  assert.equal(auditRow.signature_verified, 1);

  // Clean up
  storeSession2.close();
  try {
    fs.unlinkSync(dbFile);
  } catch {}
});
