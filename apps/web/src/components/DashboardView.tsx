import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Clock,
  Shield,
  HelpCircle,
  Percent,
  Package,
  RefreshCw,
  Calendar,
  Boxes,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  ShoppingCart
} from 'lucide-react';
import { TimeframeOption } from '@merchantiq/data-model';

interface DashboardViewProps {
  summary: any;
  selectedTimeframe: TimeframeOption;
  onSelectTimeframe: (timeframe: TimeframeOption) => void;
  onAskQuestion: (question: string) => void;
  onSelectPreset: (presetId: string) => void;
  presets: Array<{ id: string; title: string; question: string; description: string; badge: string }>;
  loading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  selectedTimeframe,
  onSelectTimeframe,
  onAskQuestion,
  onSelectPreset,
  presets,
  loading
}) => {
  const [questionInput, setQuestionInput] = useState('');
  const [showInventoryTable, setShowInventoryTable] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');

  const report = summary?.report;
  const inventory = report?.inventory;
  const monthlyTrend = report?.monthly_trend || [];
  const lossBreakdown = report?.loss_breakdown;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (questionInput.trim()) {
      onAskQuestion(questionInput.trim());
    }
  };

  const formatPaise = (paise?: number, compact = false) => {
    if (paise === undefined || paise === null) return '—';
    const rupees = paise / 100;
    if (compact) {
      if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)}Cr`;
      if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)}L`;
      if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}k`;
    }
    if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)}Cr`;
    if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)}L`;
    return `₹${rupees.toLocaleString('en-IN')}`;
  };

  const timeframeOptions: Array<{ id: TimeframeOption; label: string; sub: string }> = [
    { id: '1M', label: '1 Month', sub: 'Last 30 Days' },
    { id: '3M', label: '3 Months', sub: 'Last Quarter' },
    { id: '6M', label: '6 Months', sub: 'Last Half-Year' },
    { id: '12M', label: '12 Months', sub: 'Annual Performance' }
  ];

  // Filter SKUs
  const filteredItems = inventory?.items?.filter((item: any) =>
    item.name.toLowerCase().includes(skuSearch.toLowerCase()) ||
    item.sku.toLowerCase().includes(skuSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(skuSearch.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8 pb-16">
      {/* Hero / Main Ask MerchantIQ CTA */}
      <div className="relative rounded-2xl bg-gradient-to-br from-blue-950/40 via-gray-900 to-indigo-950/30 border border-blue-900/40 p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            AI Decision Intelligence Layer
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Before you make a business decision, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">simulate its consequences.</span>
          </h1>

          <p className="text-gray-300 text-sm md:text-base leading-relaxed">
            Ask any question about discounts, refunds, pricing, ad spend, or inventory. MerchantIQ generates realistic alternatives, executes deterministic financial simulations, enforces your cash and margin rules, and recommends the optimal path.
          </p>

          {/* Ask Input Form */}
          <form onSubmit={handleSubmit} className="pt-2">
            <div className="flex flex-col sm:flex-row gap-2 bg-gray-950/80 p-1.5 rounded-xl border border-gray-800 focus-within:border-blue-500 transition-all shadow-inner">
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="e.g. Diwali ke liye 5%, 10% ya 15% discount? Keep cash above ₹7L..."
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !questionInput.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Simulating...
                  </>
                ) : (
                  <>
                    Simulate Scenarios
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 5 Quick Launch Demo Scenarios */}
        <div className="pt-6 border-t border-gray-800/80 mt-6">
          <p className="text-xs uppercase font-bold tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            5-Minute Buildathon Demo Scenarios:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {presets.map((preset) => (
              <div
                key={preset.id}
                onClick={() => onSelectPreset(preset.id)}
                className="group cursor-pointer rounded-xl bg-gray-900/70 hover:bg-gray-800/90 border border-gray-800 hover:border-blue-500/50 p-3 transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                    {preset.title}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-mono flex-shrink-0">
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 line-clamp-2">{preset.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MULTI-TIMEFRAME PERFORMANCE & INVENTORY STOCK ANALYTICS SECTION */}
      {/* ========================================================================= */}
      <div className="space-y-5">
        {/* Header & Timeframe Choice Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                Business Financials & Stock Audit
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {report?.period_label || 'Performance Overview'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Historical Performance, Stock Valuation & Loss Diagnostics
            </h2>
          </div>

          {/* Timeframe Selector Pills (1M / 3M / 6M / 12M) */}
          <div className="flex items-center bg-gray-950 p-1 rounded-xl border border-gray-800 shadow-inner">
            {timeframeOptions.map((tf) => {
              const isActive = selectedTimeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  onClick={() => onSelectTimeframe(tf.id)}
                  className={`flex flex-col items-center px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <span>{tf.label}</span>
                  <span className="text-[9px] font-normal opacity-80 hidden sm:inline">{tf.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 6 Core Metric Cards for Selected Timeframe */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* 1. Period Revenue (GMV / Net) */}
          <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-4 space-y-1 hover:border-gray-700 transition-all">
            <span className="text-[11px] font-medium uppercase text-gray-400">Captured Revenue</span>
            <div className="text-lg sm:text-xl font-bold font-mono text-white">
              {formatPaise(report?.net_revenue_paise)}
            </div>
            <span className="text-[10px] text-blue-400 font-medium block">
              {report?.orders_count?.toLocaleString('en-IN')} total orders
            </span>
          </div>

          {/* 2. Period Net Profit & Margin */}
          <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-4 space-y-1 hover:border-gray-700 transition-all">
            <span className="text-[11px] font-medium uppercase text-gray-400">Net Profit</span>
            <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
              {formatPaise(report?.net_profit_paise)}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium block">
              {report?.profit_margin_pct}% net margin
            </span>
          </div>

          {/* 3. Business Stock & Inventory Valuation */}
          <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-4 space-y-1 hover:border-gray-700 transition-all">
            <span className="text-[11px] font-medium uppercase text-gray-400 flex items-center justify-between">
              <span>Inventory Stock</span>
              {inventory?.low_stock_items_count > 0 && (
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
              )}
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono text-indigo-300">
              {formatPaise(inventory?.total_valuation_paise)}
            </div>
            <span className="text-[10px] text-indigo-400 font-medium block">
              {inventory?.total_units?.toLocaleString('en-IN')} units in stock
            </span>
          </div>

          {/* 4. Avoidable Business Losses */}
          <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-4 space-y-1 hover:border-gray-700 transition-all">
            <span className="text-[11px] font-medium uppercase text-gray-400">Total Leaked Loss</span>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-400">
              {formatPaise(lossBreakdown?.total_avoidable_loss_paise)}
            </div>
            <span className="text-[10px] text-rose-400 font-medium block">
              Returns, CAC & dead stock
            </span>
          </div>

          {/* 5. Refund Rate & Return Count */}
          <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-4 space-y-1 hover:border-gray-700 transition-all">
            <span className="text-[11px] font-medium uppercase text-gray-400">Refund Rate</span>
            <div className="text-lg sm:text-xl font-bold font-mono text-amber-400">
              {report?.refund_rate_pct}%
            </div>
            <span className="text-[10px] text-amber-400 font-medium block">
              {report?.refund_count} refunds in period
            </span>
          </div>

          {/* 6. Current Cash Reserve */}
          <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-4 space-y-1 hover:border-gray-700 transition-all">
            <span className="text-[11px] font-medium uppercase text-gray-400">Cash Reserve</span>
            <div className="text-lg sm:text-xl font-bold font-mono text-blue-400">
              {formatPaise(summary?.metrics?.current_cash_paise)}
            </div>
            <span className="text-[10px] text-gray-400 font-medium block">
              Guardrail: ₹7.00L min
            </span>
          </div>
        </div>

        {/* Mid Row: Monthly Trends Chart + Loss Breakdown Waterfall */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Monthly Trend Bar/Line Visualization (7 cols) */}
          <div className="lg:col-span-7 rounded-xl bg-gray-900/80 border border-gray-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-gray-300 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  Monthly Financial Performance Trend ({selectedTimeframe})
                </span>
                <p className="text-[11px] text-gray-400">
                  Revenue vs Profit vs Avoidable Loss over {report?.months_count} month(s)
                </p>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-medium text-gray-400">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500"></span> Revenue</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500"></span> Profit</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-500"></span> Loss</span>
              </div>
            </div>

            {/* SVG Trend Bar Chart */}
            <div className="h-48 w-full pt-4">
              <svg viewBox={`0 0 ${Math.max(monthlyTrend.length * 60, 300)} 150`} className="w-full h-full overflow-visible">
                {/* Horizontal Grid lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="#374151" strokeDasharray="3 3" strokeWidth="0.5" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#374151" strokeDasharray="3 3" strokeWidth="0.5" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#374151" strokeWidth="0.8" />

                {monthlyTrend.map((item: any, idx: number) => {
                  const maxVal = 75000000; // ₹75L scale
                  const slotWidth = 500 / monthlyTrend.length;
                  const xBase = idx * slotWidth + slotWidth / 4;

                  const revHeight = Math.max((item.revenue_paise / maxVal) * 110, 4);
                  const profitHeight = Math.max((item.profit_paise / maxVal) * 110, 3);
                  const lossHeight = Math.max((item.loss_paise / maxVal) * 110, 2);

                  return (
                    <g key={idx} className="group cursor-pointer">
                      {/* Revenue Bar (Blue) */}
                      <rect
                        x={xBase}
                        y={120 - revHeight}
                        width={slotWidth * 0.22}
                        height={revHeight}
                        fill="#3B82F6"
                        rx="2"
                        className="transition-all hover:brightness-125"
                      />
                      {/* Profit Bar (Emerald) */}
                      <rect
                        x={xBase + slotWidth * 0.24}
                        y={120 - profitHeight}
                        width={slotWidth * 0.22}
                        height={profitHeight}
                        fill="#10B981"
                        rx="2"
                        className="transition-all hover:brightness-125"
                      />
                      {/* Loss Bar (Rose) */}
                      <rect
                        x={xBase + slotWidth * 0.48}
                        y={120 - lossHeight}
                        width={slotWidth * 0.22}
                        height={lossHeight}
                        fill="#EF4444"
                        rx="2"
                        className="transition-all hover:brightness-125"
                      />

                      {/* X-axis Month Label */}
                      <text
                        x={xBase + slotWidth * 0.35}
                        y="140"
                        textAnchor="middle"
                        fontSize="8"
                        fill="#9CA3AF"
                        fontFamily="monospace"
                      >
                        {item.month.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="flex justify-between text-[11px] text-gray-500 font-mono pt-1 border-t border-gray-800">
              <span>Avg AOV: ₹2,000</span>
              <span>Avg Gross Margin: ~48%</span>
              <span>Total Period Profit: {formatPaise(report?.net_profit_paise, true)}</span>
            </div>
          </div>

          {/* Right: Loss Diagnostics & Leakage Waterfall (5 cols) */}
          <div className="lg:col-span-5 rounded-xl bg-gray-900/80 border border-gray-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Avoidable Business Loss Breakdown
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {formatPaise(lossBreakdown?.total_avoidable_loss_paise)}
              </span>
            </div>

            <p className="text-[11px] text-gray-400">
              Identifies financial drain from reverse logistics, bounce CAC, and slow-moving stock holding:
            </p>

            <div className="space-y-2.5 text-xs">
              {/* 1. Return Shipping Losses */}
              <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-rose-900/50 transition-all">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Reverse Logistics Shipping</span>
                    <span className="font-mono font-bold text-rose-400">
                      {formatPaise(lossBreakdown?.return_shipping_loss_paise)}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">Courier charges on customer returns</span>
                </div>
                <button
                  onClick={() => onAskQuestion('Reverse logistics shipping loss is high. Simulate return policy and SKU fixes.')}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-[10px] font-bold transition-all whitespace-nowrap self-start sm:self-auto"
                >
                  <Sparkles className="h-3 w-3" />
                  SIMULATE A FIX
                </button>
              </div>

              {/* 2. Unproductive Ad Spend (CAC burn) */}
              <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-rose-900/50 transition-all">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Unproductive Ad CAC Burn</span>
                    <span className="font-mono font-bold text-rose-400">
                      {formatPaise(lossBreakdown?.unproductive_ad_spend_paise)}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">Ad spend on non-converting landing pages</span>
                </div>
                <button
                  onClick={() => onAskQuestion('There is ₹12,000 unproductive ad spend. Simulate fixes.')}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-[10px] font-bold transition-all whitespace-nowrap self-start sm:self-auto"
                >
                  <Sparkles className="h-3 w-3" />
                  SIMULATE A FIX
                </button>
              </div>

              {/* 3. Dead Stock Holding Cost */}
              <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-amber-900/50 transition-all">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Dead Stock Holding Cost</span>
                    <span className="font-mono font-bold text-amber-400">
                      {formatPaise(lossBreakdown?.dead_stock_holding_cost_paise)}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">Working capital locked in slow inventory</span>
                </div>
                <button
                  onClick={() => onAskQuestion('Dead stock holding cost is high. Simulate inventory liquidation and bundle fixes.')}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/60 text-[10px] font-bold transition-all whitespace-nowrap self-start sm:self-auto"
                >
                  <Sparkles className="h-3 w-3" />
                  SIMULATE A FIX
                </button>
              </div>

              {/* 4. Absorbed Promotional Discounts */}
              <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-blue-900/50 transition-all">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Promotional Discounts Absorbed</span>
                    <span className="font-mono font-bold text-gray-300">
                      {formatPaise(lossBreakdown?.discounts_absorbed_paise)}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">Gross margin conceded on coupon campaigns</span>
                </div>
                <button
                  onClick={() => onAskQuestion('Promotional discounts are eroding margins. Simulate targeted high-margin promotion fixes.')}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-800/60 text-[10px] font-bold transition-all whitespace-nowrap self-start sm:self-auto"
                >
                  <Sparkles className="h-3 w-3" />
                  SIMULATE A FIX
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Business Stock & SKU Inventory Health Drawer */}
        <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-5 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-950 border border-indigo-700/50 flex items-center justify-center">
                <Boxes className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Business Stock & Catalog Inventory Economics
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 font-mono">
                    {inventory?.total_units} Units • {formatPaise(inventory?.total_valuation_paise)} Valuation
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400">
                  Stock coverage: {inventory?.stock_to_sales_ratio} months • Stock turnover ratio: {inventory?.turnover_ratio}x
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInventoryTable(!showInventoryTable)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 transition-colors"
              >
                {showInventoryTable ? (
                  <>
                    Hide SKU Table <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Inspect All SKUs ({inventory?.items?.length || 0}) <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick SKU Snapshot Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            {inventory?.items?.map((item: any, i: number) => {
              const isLowStock = item.status === 'LOW_STOCK';
              return (
                <div
                  key={i}
                  className={`p-3 rounded-lg border transition-all ${
                    isLowStock
                      ? 'bg-amber-950/20 border-amber-800/60'
                      : 'bg-gray-950/60 border-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-400 font-mono">{item.sku}</span>
                    {isLowStock ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 font-bold animate-pulse">
                        LOW STOCK
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold">
                        {item.margin_pct}% Margin
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-white text-xs line-clamp-1">{item.name}</div>
                  <div className="flex justify-between items-center text-[11px] text-gray-400 font-mono mt-1">
                    <span>Stock: <strong className={isLowStock ? 'text-amber-400' : 'text-white'}>{item.stock_units}</strong></span>
                    <span>{item.days_inventory_left}d left</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expandable Detailed SKU Economics Table */}
          {showInventoryTable && (
            <div className="pt-3 border-t border-gray-800 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="relative w-full max-w-xs">
                  <Search className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={skuSearch}
                    onChange={(e) => setSkuSearch(e.target.value)}
                    placeholder="Search SKU code or product name..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  Showing {filteredItems.length} of {inventory?.items?.length} items
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-950 text-gray-400 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">SKU & Product Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Units in Stock</th>
                      <th className="py-2.5 px-3">Unit Cost (COGS)</th>
                      <th className="py-2.5 px-3">Selling Price</th>
                      <th className="py-2.5 px-3">Gross Margin</th>
                      <th className="py-2.5 px-3">Days Left</th>
                      <th className="py-2.5 px-3">Stock Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 bg-gray-900/40 font-mono">
                    {filteredItems.map((item: any, idx: number) => {
                      const isLowStock = item.status === 'LOW_STOCK';
                      return (
                        <tr key={idx} className="hover:bg-gray-800/30">
                          <td className="py-2.5 px-3 font-sans">
                            <span className="font-bold text-white block">{item.name}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{item.sku}</span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-300 font-sans">{item.category}</td>
                          <td className="py-2.5 px-3 font-bold text-white">{item.stock_units} units</td>
                          <td className="py-2.5 px-3 text-gray-300">{formatPaise(item.unit_cost_paise)}</td>
                          <td className="py-2.5 px-3 text-white font-bold">{formatPaise(item.selling_price_paise)}</td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">{item.margin_pct}%</td>
                          <td className="py-2.5 px-3 text-gray-300">{item.days_inventory_left} days</td>
                          <td className="py-2.5 px-3">
                            {isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-bold text-[10px]">
                                <AlertTriangle className="h-3 w-3" /> Reorder Alert
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-semibold text-[10px]">
                                <CheckCircle2 className="h-3 w-3" /> Healthy
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Alerts & Architecture Rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Constraints */}
        <div className="rounded-xl bg-gray-900/70 border border-gray-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-300 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              Active Merchant Guardrails
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/40 text-blue-400 font-mono">
              Enforced Hard Rules
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-gray-800">
              <span className="text-gray-400">Minimum Cash Reserve:</span>
              <span className="font-mono font-bold text-white">₹7,00,000</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-800">
              <span className="text-gray-400">Minimum Profit Margin:</span>
              <span className="font-mono font-bold text-white">18.0%</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-400">Max Promotional Discount:</span>
              <span className="font-mono font-bold text-white">25.0%</span>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 italic">
            Scenarios breaching any hard guardrail are automatically rejected by deterministic constraint logic.
          </p>
        </div>

        {/* Operational Risks */}
        <div className="rounded-xl bg-gray-900/70 border border-gray-800 p-5 space-y-3">
          <span className="text-xs uppercase tracking-wider font-bold text-gray-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Detected Operational Risks
          </span>
          <div className="space-y-2.5">
            {summary?.risks?.map((risk: any, idx: number) => (
              <div key={idx} className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{risk.type}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    risk.severity === 'HIGH' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
                  }`}>
                    {risk.severity}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">{risk.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture Separation Principle */}
        <div className="rounded-xl bg-blue-950/20 border border-blue-900/40 p-5 space-y-3">
          <span className="text-xs uppercase tracking-wider font-bold text-blue-300 flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            Fintech Safety Guarantee
          </span>
          <p className="text-xs text-gray-300 leading-relaxed">
            <strong>LLM ≠ Authoritative Calculator.</strong> MerchantIQ isolates AI interpretation from deterministic financial arithmetic.
          </p>
          <ul className="text-[11px] text-gray-400 space-y-1.5 list-disc pl-4">
            <li>Zero floating-point currency drift (Integer paise)</li>
            <li>Immutable input hashing (SHA-256)</li>
            <li>Hard constraints cannot be bypassed by model output</li>
            <li>Authoritative Razorpay API reconciliation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
