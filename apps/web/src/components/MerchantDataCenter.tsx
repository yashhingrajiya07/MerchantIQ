import React, { useState, useEffect } from 'react';
import {
  Database,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  IndianRupee,
  DollarSign,
  Package,
  TrendingUp,
  Percent,
  Truck,
  Megaphone,
  Briefcase,
  Sliders,
  History,
  Lock
} from 'lucide-react';
import { formatINR } from '@merchantiq/data-model';

interface MerchantDataCenterProps {
  onDataChanged?: () => void;
}

export const MerchantDataCenter: React.FC<MerchantDataCenterProps> = ({ onDataChanged }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Merchant Financial Inputs
  const [currentCash, setCurrentCash] = useState(800000); // ₹8,00,000
  const [monthlyOrders, setMonthlyOrders] = useState(250);
  const [averageAov, setAverageAov] = useState(2000); // ₹2,000
  const [cogsPct, setCogsPct] = useState(48.0);
  const [shippingCost, setShippingCost] = useState(90); // ₹90
  const [adSpend, setAdSpend] = useState(40000); // ₹40,000
  const [fixedExpenses, setFixedExpenses] = useState(65000); // ₹65,000
  const [otherExpenses, setOtherExpenses] = useState(10000); // ₹10,000
  const [refundRatePct, setRefundRatePct] = useState(8.0);

  // Business Rules & Constraints
  const [minCashReserve, setMinCashReserve] = useState(700000); // ₹7,00,000
  const [minMarginPct, setMinMarginPct] = useState(18.0);
  const [maxDiscountPct, setMaxDiscountPct] = useState(25.0);
  const [maxCampaignBudget, setMaxCampaignBudget] = useState(150000); // ₹1,50,000
  const [maxExpectedLoss, setMaxExpectedLoss] = useState(50000); // ₹50,000
  const [minRoi, setMinRoi] = useState(2.0); // 2.0x

  // Inventory Items
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventorySummary, setInventorySummary] = useState<any>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Fetch initial data
  const fetchDataCenter = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/merchant/data-center');
      if (res.ok) {
        const data = await res.json();
        const m = data.merchant;
        if (m) {
          setCurrentCash(m.current_cash_paise / 100);
          setMonthlyOrders(m.monthly_orders);
          setAverageAov(m.average_order_value_paise / 100);
          setCogsPct(m.average_cogs_pct);
          setShippingCost(m.average_shipping_cost_paise / 100);
          setAdSpend((m.monthly_ad_spend_paise || 4000000) / 100);
          setFixedExpenses(m.monthly_fixed_expenses_paise / 100);
          setOtherExpenses((m.other_expenses_paise || 1000000) / 100);
          setRefundRatePct(m.historical_refund_rate_pct);

          if (m.active_constraints) {
            setMinCashReserve(m.active_constraints.minimum_cash || 700000);
            setMinMarginPct(m.active_constraints.minimum_margin_pct || 18.0);
            setMaxDiscountPct(m.active_constraints.maximum_discount_pct || 25.0);
            setMaxCampaignBudget(m.active_constraints.maximum_campaign_budget || 150000);
            setMaxExpectedLoss(m.active_constraints.maximum_expected_loss || 50000);
            setMinRoi(m.active_constraints.minimum_roi || 2.0);
          }
        }
        if (data.inventory) {
          setInventorySummary(data.inventory);
          setInventoryItems(data.inventory.items || []);
        }
        if (data.audit_logs) {
          setAuditLogs(data.audit_logs);
        }
      }
    } catch (err) {
      console.error('Failed to load merchant data center:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataCenter();
  }, []);

  // Handle Saving Financial & Business Rules
  const handleSaveData = async () => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    // Client-side Validation Checks
    if (currentCash < 0) {
      setErrorMessage('Current cash balance cannot be negative.');
      setSaving(false);
      return;
    }
    if (monthlyOrders < 1) {
      setErrorMessage('Monthly baseline orders must be at least 1.');
      setSaving(false);
      return;
    }
    if (shippingCost <= 0) {
      setErrorMessage('Shipping cost must be greater than zero.');
      setSaving(false);
      return;
    }
    if (cogsPct < 1 || cogsPct > 95) {
      setErrorMessage('Average COGS % must be between 1% and 95%.');
      setSaving(false);
      return;
    }
    if (minMarginPct < 0 || minMarginPct > 90) {
      setErrorMessage('Minimum margin floor must be between 0% and 90%.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/merchant/data-center', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_cash: currentCash,
          monthly_orders: monthlyOrders,
          average_order_value: averageAov,
          average_cogs_pct: cogsPct,
          average_shipping_cost: shippingCost,
          monthly_ad_spend: adSpend,
          monthly_fixed_expenses: fixedExpenses,
          other_expenses: otherExpenses,
          historical_refund_rate_pct: refundRatePct,
          constraints: {
            minimum_cash: minCashReserve,
            minimum_cash_paise: minCashReserve * 100,
            minimum_margin_pct: minMarginPct,
            maximum_discount_pct: maxDiscountPct,
            maximum_campaign_budget: maxCampaignBudget,
            maximum_expected_loss: maxExpectedLoss,
            minimum_roi: minRoi
          }
        })
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMessage(result.details ? result.details.join(' ') : (result.error || 'Failed to update merchant settings.'));
      } else {
        setSuccessMessage('Business parameters & constraints saved to SQLite and recalculated across all engines!');
        if (result.inventory) setInventorySummary(result.inventory);
        if (result.audit_logs) setAuditLogs(result.audit_logs);
        if (onDataChanged) onDataChanged();
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error updating data center');
    } finally {
      setSaving(false);
    }
  };

  // Handle SKU Stock & Cost Updates
  const handleUpdateSku = async (sku: string, stockUnits: number, unitCostRupees: number, threshold: number) => {
    try {
      const res = await fetch(`/api/merchant/inventory/${sku}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_units: stockUnits,
          unit_cost: unitCostRupees,
          reorder_threshold: threshold
        })
      });
      const result = await res.json();
      if (res.ok) {
        setInventorySummary(result.inventory);
        setInventoryItems(result.inventory.items || []);
        if (result.audit_logs) setAuditLogs(result.audit_logs);
        setSuccessMessage(`SKU ${sku} updated. Derived inventory valuation recalculated to ${formatINR(result.inventory.total_valuation_paise, { compact: true })}.`);
        if (onDataChanged) onDataChanged();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(result.details ? result.details.join(' ') : result.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update SKU');
    }
  };

  // Quick Preset for Test Flow: ₹7L cash, 700 stock, ₹150 shipping, ₹50k ads
  const handleApplyTestCriteria = async () => {
    setMinCashReserve(700000);
    setCurrentCash(700000);
    setShippingCost(150);
    setAdSpend(50000);

    // Update SKU-KURTI-01 to 700 units
    if (inventoryItems.length > 0) {
      const firstSku = inventoryItems[0];
      await handleUpdateSku(firstSku.sku, 700, firstSku.unit_cost_paise / 100, firstSku.reorder_threshold);
    }

    setSuccessMessage('Preset applied: Min Cash ₹7.0L, Stock 700 units, Shipping ₹150, Ad Spend ₹50k. Click "Save & Recalculate" to commit.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Derived calculations
  const grossMonthlyRevenueRupees = monthlyOrders * averageAov;
  const cogsRupees = grossMonthlyRevenueRupees * (cogsPct / 100);
  const shippingRupees = monthlyOrders * shippingCost;
  const razorpayFeeRupees = grossMonthlyRevenueRupees * 0.0236; // 2.36%
  const totalVariableCosts = cogsRupees + shippingRupees + razorpayFeeRupees + adSpend;
  const derivedMonthlyNetProfit = grossMonthlyRevenueRupees - totalVariableCosts - fixedExpenses - otherExpenses;
  const derivedMarginPct = ((derivedMonthlyNetProfit / grossMonthlyRevenueRupees) * 100).toFixed(1);

  return (
    <div className="space-y-8 pb-16">
      {/* Header & Quick Action Bar */}
      <div className="bg-[#111625] border border-gray-800 rounded-xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  Merchant Data Center
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-700/50">
                    Live Authoritative Store
                  </span>
                </h1>
                <p className="text-xs text-gray-400">
                  Configure business inputs, SKU inventory, and hard constraints. Values are validated, persisted to SQLite, and immediately feed the simulation engine.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleApplyTestCriteria}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 hover:bg-indigo-900/60 transition flex items-center gap-1.5"
              title="Sets: ₹7L cash buffer, 700 SKU stock, ₹150 shipping, ₹50k ad spend"
            >
              <Sliders className="h-3.5 w-3.5" />
              Load Buildathon Test Values
            </button>
            <button
              onClick={handleSaveData}
              disabled={saving}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save & Recalculate'}
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-700/60 rounded-lg text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-700/60 rounded-lg text-red-200 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Grid: 3 Main Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECTION 1: FINANCIAL ASSUMPTIONS */}
        <div className="bg-[#111625] border border-gray-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Financial Baseline</h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-800/40">
              MERCHANT INPUT
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Cash */}
            <div>
              <label className="block text-gray-400 mb-1 font-medium">
                Current Cash Reserve (₹)
                <span className="ml-1 text-[10px] text-gray-400">• Liquid bank balance</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  value={currentCash}
                  onChange={(e) => setCurrentCash(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Monthly Orders & AOV */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Monthly Orders</label>
                <input
                  type="number"
                  value={monthlyOrders}
                  onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Avg Order Value (₹)</label>
                <input
                  type="number"
                  value={averageAov}
                  onChange={(e) => setAverageAov(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* COGS % & Shipping Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Avg COGS (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={cogsPct}
                  onChange={(e) => setCogsPct(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Shipping Cost / Order (₹)</label>
                <input
                  type="number"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Ad Spend & Fixed Expenses */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Monthly Ad Spend (₹)</label>
                <input
                  type="number"
                  value={adSpend}
                  onChange={(e) => setAdSpend(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Fixed Expenses (₹)</label>
                <input
                  type="number"
                  value={fixedExpenses}
                  onChange={(e) => setFixedExpenses(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Other Expenses & Refund Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Other Overheads (₹)</label>
                <input
                  type="number"
                  value={otherExpenses}
                  onChange={(e) => setOtherExpenses(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Refund Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={refundRatePct}
                  onChange={(e) => setRefundRatePct(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Live Derived Summary Card */}
            <div className="p-3 bg-[#0B0F19] rounded-lg border border-gray-800 space-y-1.5 pt-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">Monthly Gross Revenue:</span>
                <span className="font-mono font-bold text-white">₹{(grossMonthlyRevenueRupees / 100000).toFixed(2)}L</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">Derived Monthly Net Profit:</span>
                <span className="font-mono font-bold text-emerald-400">₹{(derivedMonthlyNetProfit / 100000).toFixed(2)}L ({derivedMarginPct}%)</span>
              </div>
              <div className="text-[10px] text-gray-400 text-right pt-1">
                Badge: <span className="text-cyan-400 font-semibold">DERIVED CALCULATION</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: BUSINESS RULES & CONSTRAINTS */}
        <div className="bg-[#111625] border border-gray-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Business Rules & Constraints</h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800/40">
              SAFETY RULES
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Minimum Cash Reserve */}
            <div>
              <label className="block text-gray-400 mb-1 font-medium">
                Minimum Cash Reserve (₹)
                <span className="ml-1 text-[10px] text-red-400 font-semibold">• Hard Failure Limit</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  value={minCashReserve}
                  onChange={(e) => setMinCashReserve(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Any scenario projecting cash buffer below this threshold is deterministically marked <span className="text-red-400 font-bold">REJECTED</span>.
              </p>
            </div>

            {/* Minimum Margin Floor */}
            <div>
              <label className="block text-gray-400 mb-1 font-medium">
                Minimum Profit Margin Floor (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={minMarginPct}
                onChange={(e) => setMinMarginPct(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Maximum Allowed Discount */}
            <div>
              <label className="block text-gray-400 mb-1 font-medium">
                Maximum Allowed Discount (%)
              </label>
              <input
                type="number"
                value={maxDiscountPct}
                onChange={(e) => setMaxDiscountPct(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Maximum Campaign Budget */}
            <div>
              <label className="block text-gray-400 mb-1 font-medium">
                Maximum Campaign Budget (₹)
              </label>
              <input
                type="number"
                value={maxCampaignBudget}
                onChange={(e) => setMaxCampaignBudget(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Maximum Expected Loss & Min ROI */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Max Loss Ceiling (₹)</label>
                <input
                  type="number"
                  value={maxExpectedLoss}
                  onChange={(e) => setMaxExpectedLoss(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1 font-medium">Minimum Target ROI</label>
                <input
                  type="number"
                  step="0.1"
                  value={minRoi}
                  onChange={(e) => setMinRoi(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0B0F19] border border-gray-700 rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Authoritative Razorpay Isolation Notice */}
            <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-lg text-[11px] text-blue-200/80 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-300">
                <Lock className="h-3 w-3" />
                Authoritative Razorpay Gateway Rules
              </div>
              <p>
                Gateway transaction fee is locked to <span className="font-mono text-white">2.36% (2% + 18% GST)</span> per Razorpay Test Mode integration specifications. Razorpay transactions are immutable.
              </p>
              <div className="text-[10px] text-blue-400/70 pt-1">
                Source: <span className="font-semibold text-blue-300">RAZORPAY TEST DATA</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: RECENT AUDIT LOG & REVISION HISTORY */}
        <div className="bg-[#111625] border border-gray-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Assumption Audit Log</h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800/40">
              AUDIT TRAIL
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No assumptions modified yet. Baseline settings active.</p>
            ) : (
              auditLogs.map((log, idx) => (
                <div key={log.id || idx} className="p-2.5 bg-[#0B0F19] border border-gray-800/90 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-[11px]">{log.label || log.field_name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(log.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-red-400 line-through">{log.previous_value}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-emerald-400 font-bold">{log.new_value}</span>
                  </div>
                  <div className="text-[9px] text-gray-400 flex items-center justify-between pt-0.5">
                    <span>Changed by: {log.changed_by || 'MERCHANT'}</span>
                    <span className="text-purple-400">SQLite Logged</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: INVENTORY & STOCK AUDIT TABLE */}
      <div className="bg-[#111625] border border-gray-800 rounded-xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Merchant Stock & Inventory Ledger</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800/40">
                MERCHANT INPUT
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Edit individual SKU unit stock and wholesale costs. Total units and inventory valuation are derived dynamically and update the executive dashboard immediately.
            </p>
          </div>

          {inventorySummary && (
            <div className="flex items-center gap-4 text-xs bg-[#0B0F19] px-4 py-2 rounded-lg border border-gray-800">
              <div>
                <span className="text-gray-400 block text-[10px]">Total Stock Units</span>
                <span className="font-bold text-white font-mono">{inventorySummary.total_units} units</span>
              </div>
              <div className="border-l border-gray-800 pl-4">
                <span className="text-gray-400 block text-[10px]">Derived Valuation</span>
                <span className="font-bold text-amber-400 font-mono">{formatINR(inventorySummary.total_valuation_paise, { compact: true })}</span>
              </div>
              <div className="border-l border-gray-800 pl-4">
                <span className="text-gray-400 block text-[10px]">Reorder Alerts</span>
                <span className={`font-bold font-mono ${inventorySummary.low_stock_items_count > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {inventorySummary.low_stock_items_count} SKU(s)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3">SKU & Product Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 w-32">Stock Quantity</th>
                <th className="py-3 px-3 w-32">Unit Cost (₹)</th>
                <th className="py-3 px-3">Selling Price (₹)</th>
                <th className="py-3 px-3">Derived Value</th>
                <th className="py-3 px-3">Margin %</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {inventoryItems.map((item) => (
                <SkuRow
                  key={item.sku}
                  item={item}
                  onSave={handleUpdateSku}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface SkuRowProps {
  item: any;
  onSave: (sku: string, stockUnits: number, unitCost: number, threshold: number) => void;
}

const SkuRow: React.FC<SkuRowProps> = ({ item, onSave }) => {
  const [stock, setStock] = useState(item.stock_units);
  const [unitCost, setUnitCost] = useState(item.unit_cost_paise / 100);
  const [threshold, setThreshold] = useState(item.reorder_threshold);
  const [modified, setModified] = useState(false);

  const derivedValuationPaise = stock * (unitCost * 100);
  const marginPct = ((((item.selling_price_paise / 100) - unitCost) / (item.selling_price_paise / 100)) * 100).toFixed(1);

  return (
    <tr className="hover:bg-gray-800/30 transition">
      <td className="py-3 px-3">
        <div className="font-semibold text-white">{item.name}</div>
        <div className="text-[10px] font-mono text-gray-400">{item.sku}</div>
      </td>
      <td className="py-3 px-3 text-gray-300">{item.category}</td>
      <td className="py-3 px-3">
        <input
          type="number"
          value={stock}
          onChange={(e) => {
            setStock(Number(e.target.value));
            setModified(true);
          }}
          className="w-24 px-2 py-1 bg-[#0B0F19] border border-gray-700 rounded text-white font-mono focus:border-blue-500 focus:outline-none"
        />
      </td>
      <td className="py-3 px-3">
        <div className="relative">
          <span className="absolute left-2 top-1 text-gray-400 text-xs">₹</span>
          <input
            type="number"
            value={unitCost}
            onChange={(e) => {
              setUnitCost(Number(e.target.value));
              setModified(true);
            }}
            className="w-24 pl-5 pr-2 py-1 bg-[#0B0F19] border border-gray-700 rounded text-white font-mono focus:border-blue-500 focus:outline-none"
          />
        </div>
      </td>
      <td className="py-3 px-3 font-mono text-gray-300">
        ₹{(item.selling_price_paise / 100).toLocaleString('en-IN')}
      </td>
      <td className="py-3 px-3 font-mono font-bold text-amber-400">
        {formatINR(derivedValuationPaise, { compact: true })}
      </td>
      <td className="py-3 px-3 font-mono text-emerald-400">
        {marginPct}%
      </td>
      <td className="py-3 px-3">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            stock <= threshold
              ? 'bg-red-950/60 text-red-300 border-red-700/50'
              : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
          }`}
        >
          {stock <= threshold ? 'LOW STOCK' : 'IN STOCK'}
        </span>
      </td>
      <td className="py-3 px-3 text-right">
        {modified && (
          <button
            onClick={() => {
              onSave(item.sku, stock, unitCost, threshold);
              setModified(false);
            }}
            className="px-2.5 py-1 text-[11px] font-bold rounded bg-blue-600 hover:bg-blue-500 text-white transition"
          >
            Update
          </button>
        )}
      </td>
    </tr>
  );
};
