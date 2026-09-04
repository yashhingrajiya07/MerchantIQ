import React from 'react';
import {
  X,
  ShieldCheck,
  XCircle,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Truck,
  DollarSign,
  Calendar,
  Layers
} from 'lucide-react';

interface ScenarioModalProps {
  scenario: any;
  onClose: () => void;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({ scenario, onClose }) => {
  if (!scenario) return null;

  const formatPaise = (paise?: number) => {
    if (paise === undefined) return '—';
    const rupees = paise / 100;
    if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)}Cr`;
    if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)}L`;
    return `₹${rupees.toLocaleString('en-IN')}`;
  };

  const trajectory = scenario.cash_trajectory_days || [];
  const minCashInTraj = Math.min(...trajectory.map((t: any) => t.cash_paise), scenario.projected_minimum_cash_paise);
  const maxCashInTraj = Math.max(...trajectory.map((t: any) => t.cash_paise), scenario.opening_cash_paise);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                Deterministic Financial Audit
              </span>
              <span className="text-xs text-gray-400 font-mono">
                Engine v{scenario.engine_version || '1.0.0'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">{scenario.name}</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Inputs Hash: {scenario.inputs_hash?.substring(0, 16)}... (100% Reproducible)
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 30-Day Cash Trajectory Chart (SVG) */}
        <div className="rounded-xl bg-gray-950/70 border border-gray-800 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-gray-300 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-blue-400" />
              30-Day Working Capital Cash Trajectory
            </span>
            <span className="text-xs font-mono text-gray-400">
              Lowest Point: <strong className="text-blue-400">{formatPaise(scenario.projected_minimum_cash_paise)}</strong>
            </span>
          </div>

          {/* Clean SVG Line Chart */}
          <div className="h-40 w-full pt-4">
            <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="cashGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="#374151" strokeDasharray="3 3" strokeWidth="0.5" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#374151" strokeDasharray="3 3" strokeWidth="0.5" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="#374151" strokeDasharray="3 3" strokeWidth="0.5" />

              {trajectory.length > 1 && (
                <>
                  {/* Area fill */}
                  <polygon
                    points={`0,120 ${trajectory
                      .map((t: any, idx: number) => {
                        const x = (idx / (trajectory.length - 1)) * 500;
                        const range = Math.max(maxCashInTraj - minCashInTraj, 1);
                        const y = 110 - ((t.cash_paise - minCashInTraj) / range) * 90;
                        return `${x},${y}`;
                      })
                      .join(' ')} 500,120`}
                    fill="url(#cashGrad)"
                  />

                  {/* Line stroke */}
                  <polyline
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={trajectory
                      .map((t: any, idx: number) => {
                        const x = (idx / (trajectory.length - 1)) * 500;
                        const range = Math.max(maxCashInTraj - minCashInTraj, 1);
                        const y = 110 - ((t.cash_paise - minCashInTraj) / range) * 90;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                </>
              )}
            </svg>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 font-mono pt-1">
            <span>Day 1 (Rent & Setup)</span>
            <span>Day 7 (Payroll)</span>
            <span>Day 15</span>
            <span>Day 30 (Closing: {formatPaise(scenario.closing_cash_paise)})</span>
          </div>
        </div>

        {/* Detailed Financial Breakdown Table */}
        <div className="space-y-2">
          <span className="text-xs uppercase font-bold text-gray-300">
            Financial Calculation Audit
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 block">Gross Merchandise Value</span>
              <span className="font-mono font-bold text-white">{formatPaise(scenario.gross_merchandise_value_paise)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 block">Discount Absorbed</span>
              <span className="font-mono font-bold text-rose-400">-{formatPaise(scenario.discount_cost_paise)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 block">Net Captured Revenue</span>
              <span className="font-mono font-bold text-white">{formatPaise(scenario.net_revenue_paise)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 block">Product Cost (COGS)</span>
              <span className="font-mono font-bold text-gray-300">-{formatPaise(scenario.cogs_paise)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 block">Shipping & Logistics</span>
              <span className="font-mono font-bold text-gray-300">-{formatPaise(scenario.shipping_cost_paise)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 block">Razorpay Fees (2.36%)</span>
              <span className="font-mono font-bold text-gray-300">-{formatPaise(scenario.payment_fee_paise)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800">
              <span className="text-[10px] text-gray-400 block">Refund Exposure</span>
              <span className="font-mono font-bold text-amber-400">{formatPaise(scenario.refund_exposure_paise)}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/60">
              <span className="text-[10px] text-blue-300 block">Contribution Profit</span>
              <span className="font-mono font-bold text-emerald-400">{formatPaise(scenario.contribution_profit_paise)}</span>
            </div>
          </div>
        </div>

        {/* Constraint Check Results */}
        <div className="space-y-2">
          <span className="text-xs uppercase font-bold text-gray-300">
            Hard Guardrail Enforcement
          </span>
          <div className="space-y-1.5">
            {scenario.constraint_checks?.map((check: any, i: number) => (
              <div
                key={i}
                className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                  check.passed
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {check.passed ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold block">{check.description}</span>
                    {check.violation_message && (
                      <span className="text-[11px] text-rose-300 block">{check.violation_message}</span>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono text-[11px]">
                  <span>Status: <strong>{check.passed ? 'PASSED' : 'FAILED'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
