import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPeriodFinancialReport,
  SEED_INVENTORY,
  SEED_MERCHANT
} from '../../scripts/seed_demo_data';
import { formatINR } from '../../packages/data-model/src';

test('Timeframe reports: computes accurate metrics for 1M, 3M, 6M, and 12M periods', () => {
  const r1M = getPeriodFinancialReport('1M');
  const r3M = getPeriodFinancialReport('3M');
  const r6M = getPeriodFinancialReport('6M');
  const r12M = getPeriodFinancialReport('12M');

  // Check 1 Month
  assert.equal(r1M.timeframe, '1M');
  assert.equal(r1M.months_count, 1);
  assert.equal(r1M.net_revenue_paise, 50000000); // ₹5.0L
  assert.equal(r1M.net_profit_paise, 12070000); // ₹1.21L
  assert.ok(r1M.loss_breakdown.total_avoidable_loss_paise > 0);

  // Check 3 Months
  assert.equal(r3M.timeframe, '3M');
  assert.equal(r3M.months_count, 3);
  assert.equal(r3M.orders_count, 780);
  assert.equal(r3M.net_revenue_paise, 154500000); // ₹15.45L
  assert.ok(r3M.net_profit_paise > r1M.net_profit_paise);

  // Check 6 Months
  assert.equal(r6M.timeframe, '6M');
  assert.equal(r6M.months_count, 6);
  assert.equal(r6M.net_revenue_paise, 318000000); // ₹31.80L
  assert.ok(r6M.orders_count > r3M.orders_count);

  // Check 12 Months
  assert.equal(r12M.timeframe, '12M');
  assert.equal(r12M.months_count, 12);
  assert.equal(r12M.net_revenue_paise, 679000000); // ₹67.90L
  assert.equal(r12M.orders_count, 3450);
});

test('Business Stock & Inventory: evaluates stock units, valuation, and SKU margin tiers', () => {
  assert.equal(SEED_INVENTORY.total_units, 1850);
  assert.equal(SEED_INVENTORY.total_valuation_paise, 148200000); // ₹14.82L
  assert.equal(SEED_INVENTORY.low_stock_items_count, 1); // Denim Jacket

  const lowStockItem = SEED_INVENTORY.items.find((i) => i.status === 'LOW_STOCK');
  assert.ok(lowStockItem);
  assert.equal(lowStockItem.sku, 'SKU-JACKET-04');
  assert.equal(lowStockItem.days_inventory_left, 8);

  // High margin SKUs check
  const highMarginItems = SEED_INVENTORY.items.filter((i) => i.margin_tier === 'HIGH');
  assert.ok(highMarginItems.length >= 2);
  assert.ok(highMarginItems.every((i) => i.margin_pct >= 65));
});
