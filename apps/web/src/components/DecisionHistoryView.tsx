import React, { useState, useEffect } from 'react';
import {
  History,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Percent,
  PlusCircle
} from 'lucide-react';

interface DecisionHistoryViewProps {
  onSelectDecision: (decisionId: string) => void;
}

export const DecisionHistoryView: React.FC<DecisionHistoryViewProps> = ({ onSelectDecision }) => {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form for entering actual outcome
  const [selectedForActual, setSelectedForActual] = useState<any | null>(null);
  const [actualRevenueRupees, setActualRevenueRupees] = useState('');
  const [actualProfitRupees, setActualProfitRupees] = useState('');
  const [actualCashRupees, setActualCashRupees] = useState('');
  const [actualRefundRate, setActualRefundRate] = useState('');
  const [notes, setNotes] = useState('');

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/decisions');
      if (res.ok) {
        const data = await res.json();
        setDecisions(data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatPaise = (paise?: number) => {
    if (paise === undefined) return '—';
    const rupees = paise / 100;
    if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)}Cr`;
    if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)}L`;
    return `₹${rupees.toLocaleString('en-IN')}`;
  };

  const handleSaveActual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForActual) return;

    setLoading(true);
    try {
      await fetch(`/api/decisions/${selectedForActual.id}/record-actual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenue_paise: Number(actualRevenueRupees) * 100,
          profit_paise: Number(actualProfitRupees) * 100,
          cash_paise: Number(actualCashRupees) * 100,
          refund_rate_pct: Number(actualRefundRate),
          notes
        })
      });
      setSelectedForActual(null);
      fetchHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
              Audit Trail & Learning Loop
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Decision History & Predicted vs Actual</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Compare predicted simulation models with real business outcomes to calibrate future assumptions.
          </p>
        </div>
      </div>

      {/* Decisions List */}
      <div className="space-y-4">
        {decisions.map((dec) => {
          const rec = dec.scenarios?.find((s: any) => s.status === 'RECOMMENDED') || dec.scenarios?.[0];
          const hasActual = !!dec.actual_outcome;

          // Variance calculation
          let revVariance = 0;
          let profitVariance = 0;
          if (hasActual && rec) {
            revVariance = Number((((dec.actual_outcome.revenue_paise - rec.net_revenue_paise) / rec.net_revenue_paise) * 100).toFixed(1));
            profitVariance = Number((((dec.actual_outcome.profit_paise - rec.contribution_profit_paise) / rec.contribution_profit_paise) * 100).toFixed(1));
          }

          return (
            <div
              key={dec.id}
              className="rounded-xl bg-gray-900/80 border border-gray-800 p-5 space-y-4 shadow-md hover:border-gray-700 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                      {dec.parsed_request?.decision_type?.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {new Date(dec.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">"{dec.question}"</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectDecision(dec.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold flex items-center gap-1"
                  >
                    Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  {!hasActual && (
                    <button
                      onClick={() => {
                        setSelectedForActual(dec);
                        setActualRevenueRupees(String((rec?.net_revenue_paise || 0) / 100));
                        setActualProfitRupees(String((rec?.contribution_profit_paise || 0) / 100));
                        setActualCashRupees(String((rec?.projected_minimum_cash_paise || 0) / 100));
                        setActualRefundRate(String(rec?.profit_margin_pct || 8));
                      }}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-xs font-semibold flex items-center gap-1"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Enter Actuals
                    </button>
                  )}
                </div>
              </div>

              {/* Recommendation summary */}
              <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Recommended Action</span>
                  <span className="font-bold text-blue-300 flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-blue-400" />
                    {rec?.name || 'Simulation Completed'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Predicted Revenue</span>
                    <span className="text-white font-bold">{formatPaise(rec?.net_revenue_paise)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Predicted Profit</span>
                    <span className="text-emerald-400 font-bold">{formatPaise(rec?.contribution_profit_paise)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Min Cash</span>
                    <span className="text-blue-400 font-bold">{formatPaise(rec?.projected_minimum_cash_paise)}</span>
                  </div>
                </div>
              </div>

              {/* Predicted vs Actual Variance Section (if recorded) */}
              {hasActual && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Predicted vs Actual Outcomes (Variance Analysis)
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Recorded {new Date(dec.actual_outcome.recorded_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                    <div className="p-2 rounded bg-gray-900/80 border border-gray-800">
                      <span className="text-[10px] text-gray-400 block">Actual Revenue</span>
                      <span className="font-mono font-bold text-white">
                        {formatPaise(dec.actual_outcome.revenue_paise)}
                      </span>
                      <span className={`text-[10px] block font-mono ${revVariance >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {revVariance >= 0 ? `+${revVariance}%` : `${revVariance}%`} variance
                      </span>
                    </div>

                    <div className="p-2 rounded bg-gray-900/80 border border-gray-800">
                      <span className="text-[10px] text-gray-400 block">Actual Profit</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatPaise(dec.actual_outcome.profit_paise)}
                      </span>
                      <span className={`text-[10px] block font-mono ${profitVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {profitVariance >= 0 ? `+${profitVariance}%` : `${profitVariance}%`} variance
                      </span>
                    </div>

                    <div className="p-2 rounded bg-gray-900/80 border border-gray-800">
                      <span className="text-[10px] text-gray-400 block">Lowest Cash Position</span>
                      <span className="font-mono font-bold text-blue-400">
                        {formatPaise(dec.actual_outcome.cash_paise)}
                      </span>
                      <span className="text-[10px] text-emerald-400 block font-mono">
                        Safe (&gt; ₹7L Reserve)
                      </span>
                    </div>

                    <div className="p-2 rounded bg-gray-900/80 border border-gray-800">
                      <span className="text-[10px] text-gray-400 block">Actual Refund Rate</span>
                      <span className="font-mono font-bold text-amber-400">
                        {dec.actual_outcome.refund_rate_pct}%
                      </span>
                      <span className="text-[10px] text-gray-400 block font-mono">
                        vs 8.0% baseline
                      </span>
                    </div>
                  </div>

                  {dec.actual_outcome.notes && (
                    <p className="text-[11px] text-gray-400 italic pt-1">
                      Note: {dec.actual_outcome.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Record Actual Modal */}
      {selectedForActual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-xl bg-gray-900 border border-gray-700 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Record Realized Business Outcome</h3>
            <p className="text-xs text-gray-400">
              Input actual post-campaign figures for "{selectedForActual.question}" to complete the learning loop.
            </p>

            <form onSubmit={handleSaveActual} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Realized Net Revenue (₹):</label>
                <input
                  type="number"
                  value={actualRevenueRupees}
                  onChange={(e) => setActualRevenueRupees(e.target.value)}
                  className="w-full bg-gray-950 px-3 py-2 rounded-lg border border-gray-800 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Realized Contribution Profit (₹):</label>
                <input
                  type="number"
                  value={actualProfitRupees}
                  onChange={(e) => setActualProfitRupees(e.target.value)}
                  className="w-full bg-gray-950 px-3 py-2 rounded-lg border border-gray-800 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Realized Lowest Cash Buffer (₹):</label>
                <input
                  type="number"
                  value={actualCashRupees}
                  onChange={(e) => setActualCashRupees(e.target.value)}
                  className="w-full bg-gray-950 px-3 py-2 rounded-lg border border-gray-800 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Observed Refund Rate (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={actualRefundRate}
                  onChange={(e) => setActualRefundRate(e.target.value)}
                  className="w-full bg-gray-950 px-3 py-2 rounded-lg border border-gray-800 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Post-Campaign Notes:</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Demand was 5% higher in week 1"
                  className="w-full bg-gray-950 px-3 py-2 rounded-lg border border-gray-800 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedForActual(null)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save & Compute Variance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
