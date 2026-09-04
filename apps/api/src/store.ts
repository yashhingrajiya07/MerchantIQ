import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import {
  MerchantProfile,
  DecisionEntity,
  PaymentStatus,
  CandidateAction,
  InventoryItem,
  InventorySummary
} from '@merchantiq/data-model';
import {
  WebhookDeduplicator,
  RazorpayClient,
  PaymentReconciler
} from '@merchantiq/razorpay';
import {
  SEED_MERCHANT,
  SEED_INVENTORY,
  DEMO_PRESETS,
  executeFullSimulationPipeline
} from '../../../scripts/seed_demo_data';

export interface RazorpayOrderRecord {
  id: string;
  amount_paise: number;
  status: 'paid' | 'created' | 'attempted';
  created_at: string;
}

export interface RazorpayPaymentRecord {
  id: string;
  order_id: string;
  amount_paise: number;
  status: PaymentStatus;
  method: string;
  captured_at: string;
}

export interface RazorpayRefundRecord {
  id: string;
  payment_id: string;
  amount_paise: number;
  status: 'processed' | 'pending';
  created_at: string;
}

export interface RazorpaySettlementRecord {
  id: string;
  amount_paise: number;
  status: 'processed';
  settlement_date: string;
  utr: string;
}

/**
 * SQLiteStore: Production-grade persistent store using Node's native SQLite engine.
 * Persists merchants, decisions, scenarios, assumptions, constraints, recommendations,
 * predicted vs actual outcomes, and webhook audit events across server restarts.
 */
export class SQLiteStore {
  private db: DatabaseSync;
  public merchant!: MerchantProfile;
  public decisions = new Map<string, DecisionEntity>();
  public webhookDeduplicator = new WebhookDeduplicator();
  public razorpayClient: RazorpayClient;
  public paymentReconciler: PaymentReconciler;

  public orders: RazorpayOrderRecord[] = [];
  public payments: RazorpayPaymentRecord[] = [];
  public refunds: RazorpayRefundRecord[] = [];
  public settlements: RazorpaySettlementRecord[] = [];

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || process.env.DATABASE_FILE || path.resolve(__dirname, '../../../merchantiq.db');
    
    // Initialize SQLite native database with WAL mode and busy timeout
    this.db = new DatabaseSync(resolvedPath);
    try {
      this.db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA busy_timeout = 5000;
      `);
    } catch {}
    this.initSchema();

    this.razorpayClient = new RazorpayClient({
      keyId: process.env.RAZORPAY_KEY_ID || '',
      keySecret: process.env.RAZORPAY_KEY_SECRET || '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'merchantiq_test_webhook_secret'
    });
    this.paymentReconciler = new PaymentReconciler(this.razorpayClient);

    this.loadOrSeedData();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency TEXT NOT NULL,
        current_cash_paise INTEGER NOT NULL,
        monthly_orders INTEGER NOT NULL,
        average_order_value_paise INTEGER NOT NULL,
        historical_refund_rate_pct REAL NOT NULL,
        average_cogs_pct REAL NOT NULL,
        average_shipping_cost_paise INTEGER NOT NULL,
        payment_gateway_fee_bps INTEGER NOT NULL,
        monthly_fixed_expenses_paise INTEGER NOT NULL,
        monthly_ad_spend_paise INTEGER NOT NULL DEFAULT 4000000,
        other_expenses_paise INTEGER NOT NULL DEFAULT 1000000,
        constraints_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inventory_items (
        sku TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        stock_units INTEGER NOT NULL,
        reorder_threshold INTEGER NOT NULL,
        unit_cost_paise INTEGER NOT NULL,
        selling_price_paise INTEGER NOT NULL,
        margin_pct REAL NOT NULL,
        margin_tier TEXT NOT NULL,
        days_inventory_left INTEGER NOT NULL,
        status TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'MERCHANT INPUT',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS assumption_audit_log (
        id TEXT PRIMARY KEY,
        field_name TEXT NOT NULL,
        label TEXT NOT NULL,
        previous_value TEXT NOT NULL,
        new_value TEXT NOT NULL,
        changed_by TEXT NOT NULL DEFAULT 'MERCHANT',
        changed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        parsed_request_json TEXT NOT NULL,
        recommendation_json TEXT,
        actual_outcome_json TEXT
      );

      CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY,
        decision_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        score REAL NOT NULL,
        net_revenue_paise INTEGER NOT NULL,
        contribution_profit_paise INTEGER NOT NULL,
        min_cash_paise INTEGER NOT NULL,
        margin_pct REAL NOT NULL,
        data_json TEXT NOT NULL,
        FOREIGN KEY (decision_id) REFERENCES decisions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS decision_outcomes (
        decision_id TEXT PRIMARY KEY,
        revenue_paise INTEGER NOT NULL,
        profit_paise INTEGER NOT NULL,
        cash_paise INTEGER NOT NULL,
        refund_rate_pct REAL NOT NULL,
        notes TEXT,
        recorded_at TEXT NOT NULL,
        FOREIGN KEY (decision_id) REFERENCES decisions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        event_id TEXT UNIQUE NOT NULL,
        event_type TEXT NOT NULL,
        received_at TEXT NOT NULL,
        processed_at TEXT,
        status TEXT NOT NULL,
        payload_summary TEXT,
        signature_verified INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS razorpay_transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        order_id TEXT,
        payment_id TEXT,
        amount_paise INTEGER NOT NULL,
        status TEXT NOT NULL,
        method TEXT,
        created_at TEXT NOT NULL,
        extra_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_scenarios_decision_id ON scenarios(decision_id);
      CREATE INDEX IF NOT EXISTS idx_audit_event_id ON audit_events(event_id);
    `);

    // Safe migration checks for SQLite table evolution
    try { this.db.exec('ALTER TABLE merchants ADD COLUMN monthly_ad_spend_paise INTEGER DEFAULT 4000000;'); } catch {}
    try { this.db.exec('ALTER TABLE merchants ADD COLUMN other_expenses_paise INTEGER DEFAULT 1000000;'); } catch {}
  }

  private loadOrSeedData() {
    // 1. Load or seed merchant profile
    const merchantRow = this.db.prepare('SELECT * FROM merchants LIMIT 1').get() as any;
    if (merchantRow) {
      this.merchant = {
        id: merchantRow.id,
        name: merchantRow.name,
        currency: merchantRow.currency,
        timezone: 'Asia/Kolkata',
        current_cash_paise: merchantRow.current_cash_paise,
        monthly_orders: merchantRow.monthly_orders,
        average_order_value_paise: merchantRow.average_order_value_paise,
        historical_refund_rate_pct: merchantRow.historical_refund_rate_pct,
        average_cogs_pct: merchantRow.average_cogs_pct,
        average_shipping_cost_paise: merchantRow.average_shipping_cost_paise,
        payment_gateway_fee_bps: merchantRow.payment_gateway_fee_bps,
        monthly_fixed_expenses_paise: merchantRow.monthly_fixed_expenses_paise,
        monthly_ad_spend_paise: merchantRow.monthly_ad_spend_paise || 4000000,
        other_expenses_paise: merchantRow.other_expenses_paise || 1000000,
        active_constraints: JSON.parse(merchantRow.constraints_json)
      };
    } else {
      this.merchant = { ...SEED_MERCHANT };
      this.saveMerchant();
    }

    // 2. Load or seed inventory items
    const invCount = (this.db.prepare('SELECT COUNT(*) as cnt FROM inventory_items').get() as any)?.cnt || 0;
    if (invCount === 0) {
      const insStmt = this.db.prepare(`
        INSERT INTO inventory_items (
          sku, name, category, stock_units, reorder_threshold,
          unit_cost_paise, selling_price_paise, margin_pct, margin_tier,
          days_inventory_left, status, source, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of SEED_INVENTORY.items) {
        insStmt.run(
          item.sku,
          item.name,
          item.category,
          item.stock_units,
          item.reorder_threshold,
          item.unit_cost_paise,
          item.selling_price_paise,
          item.margin_pct,
          item.margin_tier,
          item.days_inventory_left,
          item.status,
          'MERCHANT INPUT',
          new Date().toISOString()
        );
      }
    }

    // 2. Load decisions from SQLite
    const decisionRows = this.db.prepare('SELECT * FROM decisions ORDER BY created_at DESC').all() as any[];
    for (const dRow of decisionRows) {
      const scenarioRows = this.db.prepare('SELECT data_json FROM scenarios WHERE decision_id = ?').all(dRow.id) as any[];
      const scenarios = scenarioRows.map((s) => JSON.parse(s.data_json));

      const parsedRequest = JSON.parse(dRow.parsed_request_json);
      const recommendation = dRow.recommendation_json ? JSON.parse(dRow.recommendation_json) : undefined;
      const actualOutcome = dRow.actual_outcome_json ? JSON.parse(dRow.actual_outcome_json) : undefined;

      const entity: DecisionEntity = {
        id: dRow.id,
        question: dRow.question,
        parsed_request: parsedRequest,
        objective: parsedRequest.goal,
        status: dRow.status,
        scenarios,
        recommendation,
        actual_outcome: actualOutcome,
        created_at: dRow.created_at,
        updated_at: dRow.updated_at
      };

      this.decisions.set(entity.id, entity);
    }

    // If no decisions exist in DB, seed Demo 1 (with actual outcome) and showcase presets 2-6
    if (this.decisions.size === 0) {
      const demo1 = executeFullSimulationPipeline('dec_demo_diwali_discount', DEMO_PRESETS[0].question, this.merchant);
      demo1.actual_outcome = {
        revenue_paise: 60200000, // Actual: ₹6.02L
        profit_paise: 14300000,  // Actual: ₹1.43L
        cash_paise: 74800000,    // Actual: ₹7.48L
        refund_rate_pct: 8.2,
        recorded_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        notes: 'Completed Diwali high-margin 10% promo campaign. Strong margin retention achieved.'
      };
      this.saveDecision(demo1);

      for (let i = 1; i < DEMO_PRESETS.length; i++) {
        const preset = DEMO_PRESETS[i];
        const dec = executeFullSimulationPipeline(preset.id, preset.question, this.merchant);
        this.saveDecision(dec);
      }
    }

    // 3. Load or seed Razorpay transactions
    const txRows = this.db.prepare('SELECT * FROM razorpay_transactions').all() as any[];
    if (txRows.length > 0) {
      for (const row of txRows) {
        if (row.type === 'order') {
          this.orders.push({ id: row.id, amount_paise: row.amount_paise, status: row.status, created_at: row.created_at });
        } else if (row.type === 'payment') {
          this.payments.push({ id: row.id, order_id: row.order_id, amount_paise: row.amount_paise, status: row.status as PaymentStatus, method: row.method, captured_at: row.created_at });
        } else if (row.type === 'refund') {
          this.refunds.push({ id: row.id, payment_id: row.payment_id, amount_paise: row.amount_paise, status: row.status, created_at: row.created_at });
        } else if (row.type === 'settlement') {
          this.settlements.push({ id: row.id, amount_paise: row.amount_paise, status: row.status, settlement_date: row.created_at, utr: row.method });
        }
      }
    } else {
      this.seedSyntheticTransactions();
    }

    // 4. Load audit events into deduplicator
    const auditRows = this.db.prepare('SELECT * FROM audit_events ORDER BY received_at DESC LIMIT 50').all() as any[];
    for (const aRow of auditRows) {
      this.webhookDeduplicator.recordEvent(aRow.event_id, aRow.event_type, aRow.payload_summary);
      if (aRow.status === 'PROCESSED') {
        this.webhookDeduplicator.markProcessed(aRow.event_id);
      }
    }
  }

  public saveMerchant() {
    const stmt = this.db.prepare(`
      INSERT INTO merchants (
        id, name, currency, current_cash_paise, monthly_orders, average_order_value_paise,
        historical_refund_rate_pct, average_cogs_pct, average_shipping_cost_paise,
        payment_gateway_fee_bps, monthly_fixed_expenses_paise, monthly_ad_spend_paise, other_expenses_paise,
        constraints_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        current_cash_paise = excluded.current_cash_paise,
        monthly_orders = excluded.monthly_orders,
        average_order_value_paise = excluded.average_order_value_paise,
        historical_refund_rate_pct = excluded.historical_refund_rate_pct,
        average_cogs_pct = excluded.average_cogs_pct,
        average_shipping_cost_paise = excluded.average_shipping_cost_paise,
        payment_gateway_fee_bps = excluded.payment_gateway_fee_bps,
        monthly_fixed_expenses_paise = excluded.monthly_fixed_expenses_paise,
        monthly_ad_spend_paise = excluded.monthly_ad_spend_paise,
        other_expenses_paise = excluded.other_expenses_paise,
        constraints_json = excluded.constraints_json,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      this.merchant.id,
      this.merchant.name,
      this.merchant.currency,
      this.merchant.current_cash_paise,
      this.merchant.monthly_orders,
      this.merchant.average_order_value_paise,
      this.merchant.historical_refund_rate_pct,
      this.merchant.average_cogs_pct,
      this.merchant.average_shipping_cost_paise,
      this.merchant.payment_gateway_fee_bps,
      this.merchant.monthly_fixed_expenses_paise,
      this.merchant.monthly_ad_spend_paise || 4000000,
      this.merchant.other_expenses_paise || 1000000,
      JSON.stringify(this.merchant.active_constraints),
      new Date().toISOString()
    );
  }

  public saveDecision(decision: DecisionEntity) {
    this.decisions.set(decision.id, decision);

    // Save decision row
    const dStmt = this.db.prepare(`
      INSERT INTO decisions (id, question, status, created_at, updated_at, parsed_request_json, recommendation_json, actual_outcome_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at,
        parsed_request_json = excluded.parsed_request_json,
        recommendation_json = excluded.recommendation_json,
        actual_outcome_json = excluded.actual_outcome_json
    `);

    dStmt.run(
      decision.id,
      decision.question,
      decision.status,
      decision.created_at,
      decision.updated_at,
      JSON.stringify(decision.parsed_request),
      decision.recommendation ? JSON.stringify(decision.recommendation) : null,
      decision.actual_outcome ? JSON.stringify(decision.actual_outcome) : null
    );

    // Replace scenarios
    this.db.prepare('DELETE FROM scenarios WHERE decision_id = ?').run(decision.id);
    const sStmt = this.db.prepare(`
      INSERT OR REPLACE INTO scenarios (id, decision_id, name, status, score, net_revenue_paise, contribution_profit_paise, min_cash_paise, margin_pct, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let idx = 0; idx < decision.scenarios.length; idx++) {
      const scen = decision.scenarios[idx];
      const uniqueScenId = `${decision.id}_${scen.scenario_id}_${idx}`;
      sStmt.run(
        uniqueScenId,
        decision.id,
        scen.name,
        scen.status,
        scen.score,
        scen.net_revenue_paise,
        scen.contribution_profit_paise,
        scen.projected_minimum_cash_paise,
        scen.profit_margin_pct,
        JSON.stringify(scen)
      );
    }

    // Save actual outcome if recorded
    if (decision.actual_outcome) {
      const oStmt = this.db.prepare(`
        INSERT INTO decision_outcomes (decision_id, revenue_paise, profit_paise, cash_paise, refund_rate_pct, notes, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(decision_id) DO UPDATE SET
          revenue_paise = excluded.revenue_paise,
          profit_paise = excluded.profit_paise,
          cash_paise = excluded.cash_paise,
          refund_rate_pct = excluded.refund_rate_pct,
          notes = excluded.notes,
          recorded_at = excluded.recorded_at
      `);
      oStmt.run(
        decision.id,
        decision.actual_outcome.revenue_paise,
        decision.actual_outcome.profit_paise,
        decision.actual_outcome.cash_paise,
        decision.actual_outcome.refund_rate_pct,
        decision.actual_outcome.notes || null,
        decision.actual_outcome.recorded_at
      );
    }
  }

  public recordAuditEvent(eventId: string, eventType: string, status: string, payloadSummary?: string, verified = 1) {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO audit_events (id, event_id, event_type, received_at, status, payload_summary, signature_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_id) DO UPDATE SET
        status = excluded.status,
        processed_at = ?
    `);

    stmt.run(id, eventId, eventType, now, status, payloadSummary || null, verified, now);
  }

  private seedSyntheticTransactions() {
    const now = Date.now();
    const tStmt = this.db.prepare(`
      INSERT OR IGNORE INTO razorpay_transactions (id, type, order_id, payment_id, amount_paise, status, method, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 1; i <= 25; i++) {
      const orderId = `order_test_${1000 + i}`;
      const amountPaise = 150000 + (i % 5) * 50000;
      const orderDate = new Date(now - (26 - i) * 86400000).toISOString();

      tStmt.run(orderId, 'order', null, null, amountPaise, 'paid', null, orderDate);
      this.orders.push({ id: orderId, amount_paise: amountPaise, status: 'paid', created_at: orderDate });

      const payId = `pay_test_${5000 + i}`;
      const payDate = new Date(now - (26 - i) * 86400000 + 30000).toISOString();
      const method = i % 2 === 0 ? 'upi' : 'card';
      tStmt.run(payId, 'payment', orderId, null, amountPaise, 'captured', method, payDate);
      this.payments.push({ id: payId, order_id: orderId, amount_paise: amountPaise, status: PaymentStatus.CAPTURED, method, captured_at: payDate });
    }

    // Seed refunds
    const refunds = [
      { id: 'rfnd_test_01', payment_id: 'pay_test_5004', amount_paise: 200000, status: 'processed', created_at: new Date(now - 86400000 * 5).toISOString() },
      { id: 'rfnd_test_02', payment_id: 'pay_test_5008', amount_paise: 150000, status: 'processed', created_at: new Date(now - 86400000 * 2).toISOString() }
    ];
    for (const r of refunds) {
      tStmt.run(r.id, 'refund', null, r.payment_id, r.amount_paise, r.status, null, r.created_at);
      this.refunds.push(r as any);
    }

    // Seed settlements
    const settlements = [
      { id: 'setl_test_01', amount_paise: 14500000, status: 'processed', settlement_date: new Date(now - 86400000 * 4).toISOString(), utr: 'UTR_RZP_998112' },
      { id: 'setl_test_02', amount_paise: 18200000, status: 'processed', settlement_date: new Date(now - 86400000 * 2).toISOString(), utr: 'UTR_RZP_998115' },
      { id: 'setl_test_03', amount_paise: 16400000, status: 'processed', settlement_date: new Date(now - 86400000 * 1).toISOString(), utr: 'UTR_RZP_998120' }
    ];
    for (const s of settlements) {
      tStmt.run(s.id, 'settlement', null, null, s.amount_paise, s.status, s.utr, s.settlement_date);
      this.settlements.push(s as any);
    }
  }

  public getInventorySummary(): InventorySummary {
    const rows = this.db.prepare('SELECT * FROM inventory_items ORDER BY sku ASC').all() as any[];
    let total_units = 0;
    let total_valuation_paise = 0;
    let low_stock_items_count = 0;

    const items: InventoryItem[] = rows.map((r) => {
      const units = Number(r.stock_units);
      const unitCost = Number(r.unit_cost_paise);
      const sellingPrice = Number(r.selling_price_paise);
      const reorderThreshold = Number(r.reorder_threshold);

      total_units += units;
      total_valuation_paise += units * unitCost;

      const marginPct = sellingPrice > 0 ? Number((((sellingPrice - unitCost) / sellingPrice) * 100).toFixed(1)) : 0;
      const marginTier = marginPct >= 65 ? 'HIGH' : marginPct >= 45 ? 'MEDIUM' : 'LOW';

      const estDailyVelocity = Math.max(0.5, (this.merchant.monthly_orders * 0.25) / 30);
      const daysLeft = Math.round(units / estDailyVelocity);

      let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCKED' = 'IN_STOCK';
      if (units === 0) status = 'OUT_OF_STOCK';
      else if (units <= reorderThreshold) status = 'LOW_STOCK';
      else if (daysLeft > 75) status = 'OVERSTOCKED';

      if (status === 'LOW_STOCK' || status === 'OUT_OF_STOCK') {
        low_stock_items_count++;
      }

      return {
        sku: r.sku,
        name: r.name,
        category: r.category,
        stock_units: units,
        reorder_threshold: reorderThreshold,
        unit_cost_paise: unitCost,
        selling_price_paise: sellingPrice,
        margin_pct: marginPct,
        margin_tier: marginTier as any,
        days_inventory_left: daysLeft,
        status
      };
    });

    const monthlyOrders = Math.max(1, this.merchant.monthly_orders);
    const stockToSales = Number((total_units / monthlyOrders).toFixed(1));
    const turnoverRatio = Number((((monthlyOrders * 12) * (this.merchant.average_order_value_paise / 100)) / Math.max(1, (total_valuation_paise / 100))).toFixed(2));

    return {
      total_units,
      total_valuation_paise,
      low_stock_items_count,
      stock_to_sales_ratio: stockToSales,
      turnover_ratio: turnoverRatio,
      items
    };
  }

  public updateInventoryItem(sku: string, updates: { stock_units?: number; unit_cost_paise?: number; reorder_threshold?: number; selling_price_paise?: number }) {
    const row = this.db.prepare('SELECT * FROM inventory_items WHERE sku = ?').get(sku) as any;
    if (!row) {
      throw new Error(`SKU ${sku} not found`);
    }

    const newStock = updates.stock_units !== undefined ? updates.stock_units : row.stock_units;
    const newUnitCost = updates.unit_cost_paise !== undefined ? updates.unit_cost_paise : row.unit_cost_paise;
    const newSellingPrice = updates.selling_price_paise !== undefined ? updates.selling_price_paise : row.selling_price_paise;
    const newThreshold = updates.reorder_threshold !== undefined ? updates.reorder_threshold : row.reorder_threshold;

    const marginPct = newSellingPrice > 0 ? Number((((newSellingPrice - newUnitCost) / newSellingPrice) * 100).toFixed(1)) : 0;
    const marginTier = marginPct >= 65 ? 'HIGH' : marginPct >= 45 ? 'MEDIUM' : 'LOW';

    let status = 'IN_STOCK';
    if (newStock === 0) status = 'OUT_OF_STOCK';
    else if (newStock <= newThreshold) status = 'LOW_STOCK';

    if (updates.stock_units !== undefined && updates.stock_units !== row.stock_units) {
      const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      this.db.prepare(`
        INSERT INTO assumption_audit_log (id, field_name, label, previous_value, new_value, changed_by, changed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(logId, `inventory.${sku}.stock`, `${row.name} Stock`, `${row.stock_units} units`, `${newStock} units`, 'MERCHANT', new Date().toISOString());
    }

    this.db.prepare(`
      UPDATE inventory_items
      SET stock_units = ?, unit_cost_paise = ?, selling_price_paise = ?, reorder_threshold = ?,
          margin_pct = ?, margin_tier = ?, status = ?, source = 'MERCHANT INPUT', updated_at = ?
      WHERE sku = ?
    `).run(newStock, newUnitCost, newSellingPrice, newThreshold, marginPct, marginTier, status, new Date().toISOString(), sku);

    return this.getInventorySummary();
  }

  public updateMerchantData(updates: Partial<MerchantProfile>, changedBy = 'MERCHANT'): { merchant: MerchantProfile; auditLogs: any[] } {
    const previous = { ...this.merchant };
    const auditLogs: any[] = [];

    const auditFields: Array<{ key: keyof MerchantProfile; label: string; format?: (v: any) => string }> = [
      { key: 'current_cash_paise', label: 'Cash Balance', format: (v) => `₹${(v / 100).toLocaleString('en-IN')}` },
      { key: 'monthly_orders', label: 'Monthly Orders', format: (v) => `${v} orders` },
      { key: 'average_order_value_paise', label: 'Average Order Value', format: (v) => `₹${(v / 100).toLocaleString('en-IN')}` },
      { key: 'average_cogs_pct', label: 'Average COGS %', format: (v) => `${v}%` },
      { key: 'average_shipping_cost_paise', label: 'Shipping Cost / Order', format: (v) => `₹${(v / 100).toLocaleString('en-IN')}` },
      { key: 'monthly_ad_spend_paise', label: 'Monthly Ad Spend', format: (v) => `₹${(v / 100).toLocaleString('en-IN')}` },
      { key: 'monthly_fixed_expenses_paise', label: 'Fixed Expenses', format: (v) => `₹${(v / 100).toLocaleString('en-IN')}` },
      { key: 'historical_refund_rate_pct', label: 'Refund Rate', format: (v) => `${v}%` }
    ];

    for (const f of auditFields) {
      if (updates[f.key] !== undefined && updates[f.key] !== previous[f.key]) {
        const prevVal = f.format ? f.format(previous[f.key]) : String(previous[f.key]);
        const newVal = f.format ? f.format(updates[f.key]) : String(updates[f.key]);
        const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const now = new Date().toISOString();

        this.db.prepare(`
          INSERT INTO assumption_audit_log (id, field_name, label, previous_value, new_value, changed_by, changed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(logId, String(f.key), f.label, prevVal, newVal, changedBy, now);

        auditLogs.push({ id: logId, field: f.key, label: f.label, previous_value: prevVal, new_value: newVal, changed_at: now });
      }
    }

    if (updates.active_constraints) {
      const prevC = previous.active_constraints || {};
      const newC = updates.active_constraints;
      const constraintKeys = ['minimum_cash', 'minimum_margin_pct', 'maximum_discount_pct', 'maximum_campaign_budget', 'maximum_expected_loss', 'minimum_roi'] as const;

      for (const ck of constraintKeys) {
        if (newC[ck] !== undefined && newC[ck] !== (prevC as any)[ck]) {
          const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const now = new Date().toISOString();
          const prevVal = String((prevC as any)[ck] ?? 'N/A');
          const newVal = String(newC[ck]);

          this.db.prepare(`
            INSERT INTO assumption_audit_log (id, field_name, label, previous_value, new_value, changed_by, changed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(logId, `constraint.${ck}`, `Constraint: ${ck}`, prevVal, newVal, changedBy, now);

          auditLogs.push({ id: logId, field: `constraint.${ck}`, label: `Constraint: ${ck}`, previous_value: prevVal, new_value: newVal, changed_at: now });
        }
      }

      this.merchant.active_constraints = {
        ...this.merchant.active_constraints,
        ...newC,
        minimum_cash_paise: newC.minimum_cash !== undefined ? newC.minimum_cash * 100 : (this.merchant.active_constraints.minimum_cash_paise || 70000000)
      };
    }

    Object.assign(this.merchant, {
      ...updates,
      active_constraints: this.merchant.active_constraints
    });

    this.saveMerchant();
    return { merchant: this.merchant, auditLogs };
  }

  public getAssumptionAuditLog(limit = 25) {
    return this.db.prepare(`
      SELECT * FROM assumption_audit_log ORDER BY changed_at DESC LIMIT ?
    `).all(limit) as any[];
  }

  public close() {
    this.db.close();
  }
}

let _globalStore: SQLiteStore | null = null;
export function getGlobalStore(): SQLiteStore {
  if (!_globalStore) {
    _globalStore = new SQLiteStore();
  }
  return _globalStore;
}

export const globalStore = new Proxy({} as SQLiteStore, {
  get(_, prop) {
    return (getGlobalStore() as any)[prop];
  }
});
