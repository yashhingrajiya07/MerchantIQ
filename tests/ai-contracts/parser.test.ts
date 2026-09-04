import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDecisionLocally,
  extractRupeeAmount
} from '../../packages/ai/src';
import {
  DecisionType,
  Objective,
  StructuredDecisionObjectSchema
} from '../../packages/data-model/src';

test('AI Decision Parser: extracts Indian currency strings accurately', () => {
  assert.equal(extractRupeeAmount('7 lakh'), 700000);
  assert.equal(extractRupeeAmount('₹7L'), 700000);
  assert.equal(extractRupeeAmount('7.5 lakh'), 750000);
  assert.equal(extractRupeeAmount('50k'), 50000);
  assert.equal(extractRupeeAmount('₹50,000'), 50000);
});

test('AI Decision Parser: parses Hinglish business question into valid structured decision object', () => {
  const prompt = 'Diwali ke liye 10% ya 15% discount? Mere ko minimum 7 lakh cash rakhna hai aur margin 18% se niche nahi jana.';
  const parsed = parseDecisionLocally(prompt);

  // Validate against Zod schema
  assert.doesNotThrow(() => StructuredDecisionObjectSchema.parse(parsed));

  assert.equal(parsed.decision_type, DecisionType.PROMOTION);
  assert.equal(parsed.constraints.minimum_cash, 700000);
  assert.equal(parsed.constraints.minimum_cash_paise, 70000000);
  assert.equal(parsed.constraints.minimum_margin_pct, 18);
  assert.ok(parsed.candidate_actions.length >= 3, 'Should generate baseline + multiple discount alternatives');

  // Verify baseline is present
  assert.ok(parsed.candidate_actions.some((a) => a.type === 'baseline'));
  // Verify 10% and 15% are extracted
  assert.ok(parsed.candidate_actions.some((a) => Math.round(a.value * 100) === 10));
  assert.ok(parsed.candidate_actions.some((a) => Math.round(a.value * 100) === 15));
});

test('AI Decision Parser: handles refund escalation question', () => {
  const prompt = 'Refunds increased from 8% to 14%. What should I do?';
  const parsed = parseDecisionLocally(prompt);

  assert.doesNotThrow(() => StructuredDecisionObjectSchema.parse(parsed));
  assert.equal(parsed.decision_type, DecisionType.REFUND_POLICY);
  assert.equal(parsed.goal, Objective.REDUCE_REFUND_RISK);
  assert.ok(parsed.candidate_actions.some((a) => a.name.includes('7 Days')));
});
