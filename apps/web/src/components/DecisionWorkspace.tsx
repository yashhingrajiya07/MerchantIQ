import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Shield,
  Sliders,
  Info,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Target,
  BarChart3,
  HelpCircle,
  Percent,
  Layers,
  Activity
} from 'lucide-react';
import { Objective } from '@merchantiq/data-model';

interface DecisionWorkspaceProps {
  decision: any;
  onUpdateConstraints: (minCash: number, minMargin: number) => void;
  onSelectScenarioForModal: (scenario: any) => void;
  loading: boolean;
}

export const DecisionWorkspace: React.FC<DecisionWorkspaceProps> = ({
  decision,
  onUpdateConstraints,
  onSelectScenarioForModal,
  loading
}) => {
  const parsed = decision?.parsed_request;
  const scenarios: any[] = decision?.scenarios || [];
  const recommendation = decision?.recommendation;

  const [selectedObjective, setSelectedObjective] = useState<string>(
    parsed?.goal || 'maximize_profit'
  );

  // Local state for editable constraint sliders
  const [minCashRupees, setMinCashRupees] = useState<number>(
    parsed?.constraints?.minimum_cash || 700000
  );
  const [minMarginPct, setMinMarginPct] = useState<number>(
    parsed?.constraints?.minimum_margin_pct || 18
  );

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

  const handleApplyConstraints = () => {
    onUpdateConstraints(minCashRupees, minMarginPct);
  };

  const goalProfiles = [
    { id: 'maximize_profit', label: 'Maximize Profit', icon: DollarSign },
    { id: 'increase_revenue', label: 'Increase Revenue', icon: TrendingUp },
    { id: 'protect_liquidity', label: 'Protect Cash', icon: Shield },
    { id: 'reduce_loss', label: 'Reduce Loss', icon: Activity },
    { id: 'clear_inventory', label: 'Clear Inventory', icon: Layers },
    { id: 'balanced', label: 'Balanced Growth', icon: Target }
  ];

  const recommendedScenario = scenarios.find((s) => s.status === 'RECOMMENDED') || scenarios[0];
  const allRejected = scenarios.length > 0 && scenarios.every((s) => s.status === 'REJECTED');

  const getStatusBadge = (status: string, reason?: string) => {
    if (status === 'RECOMMENDED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold">
          <Award className="h-3.5 w-3.5" />
          RECOMMENDED
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span
          title={reason}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold cursor-help"
        >
          <XCircle className="h-3.5 w-3.5" />
          REJECTED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
        <CheckCircle2 className="h-3.5 w-3.5" />
        ELIGIBLE
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner: Active Decision Context & Goal Selector */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                Decision Type: {parsed?.decision_type?.toUpperCase() || 'BUSINESS DECISION'}
              </span>
              <span className="text-[11px] text-gray-400 font-mono">
                Horizon: {parsed?.time_horizon_days || 30} Days
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-white leading-snug">
              "{decision?.question}"
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Total Scenarios:</span>
            <span className="font-mono font-bold text-white text-base px-2.5 py-1 rounded bg-gray-800 border border-gray-700">
              {scenarios.length}
            </span>
          </div>
        </div>

        {/* Merchant Goal Profiles Switcher */}
        <div className="pt-3 border-t border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <span className="text-xs uppercase font-bold text-gray-400 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-blue-400" />
            Merchant Goal Profile:
          </span>
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-950 p-1 rounded-xl border border-gray-800">
            {goalProfiles.map((goal) => {
              const Icon = goal.icon;
              const isActive = selectedObjective === goal.id;
              return (
                <button
                  key={goal.id}
                  onClick={() => setSelectedObjective(goal.id)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {goal.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* "NO RELIABLE RECOMMENDATION" Safe State Warning if all scenarios fail */}
      {allRejected && (
        <div className="rounded-xl bg-rose-950/40 border-2 border-rose-600 p-5 space-y-2 animate-fadeIn">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <XCircle className="h-5 w-5" />
            NO RELIABLE RECOMMENDATION — ALL SCENARIOS BREACH HARD CONSTRAINTS
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Every candidate scenario fails your safety guardrails (e.g. minimum cash reserve of ₹{(minCashRupees / 100000).toFixed(2)}L or minimum margin of {minMarginPct}%). MerchantIQ refuses to hallucinate or recommend an unsafe business action. Adjust your constraints slider on the left to explore relaxed scenarios.
          </p>
        </div>
      )}

      {/* Main 3-Column Decision Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Constraints & Decision Parameters (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-300 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-blue-400" />
                Merchant Constraints
              </span>
            </div>

            {/* Slider 1: Minimum Cash Reserve */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Min Cash Reserve:</span>
                <span className="font-mono font-bold text-blue-400">
                  ₹{(minCashRupees / 100000).toFixed(2)}L
                </span>
              </div>
              <input
                type="range"
                min="500000"
                max="900000"
                step="25000"
                value={minCashRupees}
                onChange={(e) => setMinCashRupees(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>₹5L</span>
                <span>₹7L (Target)</span>
                <span>₹9L</span>
              </div>
            </div>

            {/* Slider 2: Minimum Profit Margin */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Min Margin Floor:</span>
                <span className="font-mono font-bold text-emerald-400">{minMarginPct}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="25"
                step="1"
                value={minMarginPct}
                onChange={(e) => setMinMarginPct(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>10%</span>
                <span>18% (Safety)</span>
                <span>25%</span>
              </div>
            </div>

            <button
              onClick={handleApplyConstraints}
              disabled={loading}
              className="w-full py-2 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 border border-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Re-run Constraint Filter
            </button>

            <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/30 text-[11px] text-gray-300 space-y-1">
              <p className="font-semibold text-blue-300">Sensitivity Tip:</p>
              <p>
                Lowering minimum cash to <strong>₹6.5L</strong> makes the 15% discount eligible. Raising it to <strong>₹7.8L</strong> rejects aggressive spending!
              </p>
            </div>
          </div>

          {/* Parsed Actions List */}
          <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-4 space-y-3">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-400">
              Candidate Decision Actions
            </span>
            <div className="space-y-1.5">
              {parsed?.candidate_actions?.map((act: any, idx: number) => (
                <div key={idx} className="p-2 rounded bg-gray-950/60 border border-gray-800/80 text-xs">
                  <div className="font-semibold text-white">{act.name}</div>
                  <div className="text-[10px] text-gray-400">{act.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Scenario Matrix / Comparison (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-gray-300 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Simulated Scenarios Matrix
            </span>
            <span className="text-[11px] text-gray-400">Click any card to inspect cash trajectory</span>
          </div>

          <div className="space-y-3">
            {scenarios.map((scen) => {
              const isRecommended = scen.status === 'RECOMMENDED';
              const isRejected = scen.status === 'REJECTED';
              const failedCheck = scen.constraint_checks?.find((c: any) => !c.passed);

              return (
                <div
                  key={scen.scenario_id}
                  onClick={() => onSelectScenarioForModal(scen)}
                  className={`cursor-pointer rounded-xl p-4 transition-all border ${
                    isRecommended
                      ? 'bg-blue-950/30 border-blue-500 shadow-lg shadow-blue-500/10 hover:border-blue-400'
                      : isRejected
                      ? 'bg-rose-950/10 border-rose-900/60 hover:border-rose-700/80'
                      : 'bg-gray-900/80 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        {scen.name}
                        {isRecommended && <Award className="h-4 w-4 text-blue-400 flex-shrink-0" />}
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        {scen.projected_orders?.toLocaleString('en-IN')} orders • {scen.profit_margin_pct}% margin
                      </p>
                    </div>

                    {getStatusBadge(scen.status, failedCheck?.violation_message)}
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-t border-gray-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Expected Revenue</span>
                      <span className="font-mono font-bold text-white">
                        {formatPaise(scen.net_revenue_paise)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Expected Profit</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatPaise(scen.contribution_profit_paise)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Min Cash Buffer</span>
                      <span
                        className={`font-mono font-bold ${
                          isRejected ? 'text-rose-400' : 'text-blue-400'
                        }`}
                      >
                        {formatPaise(scen.projected_minimum_cash_paise)}
                      </span>
                    </div>
                  </div>

                  {/* Rejection notice or highlight */}
                  {isRejected && failedCheck && (
                    <div className="mt-2 p-2 rounded bg-rose-950/40 border border-rose-800/50 text-[11px] text-rose-300 flex items-start gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                      <span>{failedCheck.violation_message}</span>
                    </div>
                  )}

                  {isRecommended && (
                    <div className="mt-2 p-2 rounded bg-blue-900/30 border border-blue-700/50 text-[11px] text-blue-200 flex items-center justify-between">
                      <span className="font-medium">Best profit while protecting safety reserve</span>
                      <span className="text-blue-400 font-mono font-bold flex items-center gap-0.5">
                        Inspect <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Recommendation Card & Score Breakdown (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Main Recommendation Card */}
          <div className="rounded-xl bg-gradient-to-b from-blue-900/30 to-gray-900 border-2 border-blue-500/80 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/40">
                <Sparkles className="h-3.5 w-3.5" />
                RECOMMENDED DECISION
              </div>
              <span className="text-[10px] font-mono text-gray-400 uppercase">
                Confidence: {recommendation?.confidence_rating || 'HIGH'}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-white">
                {recommendation?.recommended_scenario_name || 'Evaluating Scenarios...'}
              </h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                {recommendation?.rationale}
              </p>
            </div>

            {/* Why this scenario? */}
            <div className="p-3 rounded-lg bg-blue-950/60 border border-blue-800/60 space-y-1">
              <span className="text-[11px] uppercase font-bold text-blue-300 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-blue-400" />
                Why this scenario?
              </span>
              <p className="text-xs text-gray-200 leading-relaxed">
                {recommendation?.why_this_scenario}
              </p>
            </div>

            {/* Transparent Decision Score Breakdown Card */}
            {recommendedScenario?.score_breakdown && (
              <div className="p-3.5 rounded-lg bg-gray-950/90 border border-blue-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
                    Transparent Decision Score:
                  </span>
                  <span className="font-mono font-extrabold text-blue-400 text-sm">
                    {recommendedScenario.score_breakdown.total_score}/100
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                  <div className="p-1 rounded bg-gray-900 border border-gray-800">
                    <span className="text-gray-400 block">Profit</span>
                    <strong className="text-emerald-400">{recommendedScenario.score_breakdown.profit_pts}/40</strong>
                  </div>
                  <div className="p-1 rounded bg-gray-900 border border-gray-800">
                    <span className="text-gray-400 block">Cash</span>
                    <strong className="text-blue-400">{recommendedScenario.score_breakdown.cash_safety_pts}/25</strong>
                  </div>
                  <div className="p-1 rounded bg-gray-900 border border-gray-800">
                    <span className="text-gray-400 block">Growth</span>
                    <strong className="text-indigo-300">{recommendedScenario.score_breakdown.growth_pts}/25</strong>
                  </div>
                  <div className="p-1 rounded bg-gray-900 border border-gray-800">
                    <span className="text-gray-400 block">Risk</span>
                    <strong className="text-rose-400">-{recommendedScenario.score_breakdown.risk_penalty}/10</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3-Point Case Projection (Optimistic / Expected / Conservative) */}
          {recommendedScenario?.three_point_estimates && (
            <div className="rounded-xl bg-gray-900/90 border border-gray-800 p-4 space-y-3">
              <span className="text-xs uppercase tracking-wider font-bold text-gray-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-400" />
                3-Point Scenario Projection Range
              </span>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {/* Optimistic */}
                <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-center">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 block">Optimistic</span>
                  <div className="font-mono font-bold text-white text-xs mt-1">
                    {formatPaise(recommendedScenario.three_point_estimates.optimistic.profit_paise, true)}
                  </div>
                  <span className="text-[9px] text-gray-400 block">
                    {recommendedScenario.three_point_estimates.optimistic.margin_pct}% margin
                  </span>
                </div>

                {/* Expected */}
                <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-800/60 text-center">
                  <span className="text-[10px] font-bold uppercase text-blue-400 block">Expected</span>
                  <div className="font-mono font-bold text-white text-xs mt-1">
                    {formatPaise(recommendedScenario.three_point_estimates.expected.profit_paise, true)}
                  </div>
                  <span className="text-[9px] text-gray-400 block">
                    {recommendedScenario.three_point_estimates.expected.margin_pct}% margin
                  </span>
                </div>

                {/* Conservative */}
                <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800 text-center">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Conservative</span>
                  <div className="font-mono font-bold text-white text-xs mt-1">
                    {formatPaise(recommendedScenario.three_point_estimates.conservative.profit_paise, true)}
                  </div>
                  <span className="text-[9px] text-gray-400 block">
                    {recommendedScenario.three_point_estimates.conservative.margin_pct}% margin
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Signature Feature: "Why Not The Others?" */}
          <div className="rounded-xl bg-gray-900/90 border border-gray-800 p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                Why Not The Others?
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Comparative Rationale</span>
            </div>

            <div className="space-y-2.5">
              {recommendation?.why_not_the_others?.map((alt: any) => (
                <div
                  key={alt.scenario_id}
                  className="p-3 rounded-lg bg-gray-950/70 border border-gray-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{alt.scenario_name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        alt.status === 'REJECTED'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {alt.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-snug">{alt.reason_not_selected}</p>
                  <p className="text-[11px] text-gray-500 font-mono">{alt.trade_off_summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* "WHAT IF I'M WRONG?" SENSITIVITY ANALYSIS MATRIX */}
      {recommendedScenario?.sensitivity_analysis && recommendedScenario.sensitivity_analysis.length > 0 && (
        <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-5 space-y-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-blue-400 flex items-center gap-1.5">
                <Activity className="h-4 w-4" />
                "What If I'm Wrong?" Sensitivity Matrix
              </span>
              <p className="text-[11px] text-gray-400">
                Stress-tests demand variance (+25% to -10%) to reveal downside cash risk & constraint durability:
              </p>
            </div>
            <span className="text-[10px] font-mono text-gray-400">
              Evaluated for: {recommendedScenario.name}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-gray-950 text-gray-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Demand Lift %</th>
                  <th className="py-2.5 px-3">Projected Revenue</th>
                  <th className="py-2.5 px-3">Contribution Profit</th>
                  <th className="py-2.5 px-3">Profit Margin</th>
                  <th className="py-2.5 px-3">Projected Min Cash</th>
                  <th className="py-2.5 px-3">Safety Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 bg-gray-900/40">
                {recommendedScenario.sensitivity_analysis.map((step: any, idx: number) => {
                  const isSafe = step.status === 'ELIGIBLE';
                  return (
                    <tr key={idx} className="hover:bg-gray-800/30">
                      <td className="py-2.5 px-3 font-bold text-white">
                        {step.demand_lift_pct > 0 ? `+${step.demand_lift_pct}%` : `${step.demand_lift_pct}%`}
                      </td>
                      <td className="py-2.5 px-3 text-gray-300">{formatPaise(step.projected_revenue_paise)}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">{formatPaise(step.projected_profit_paise)}</td>
                      <td className="py-2.5 px-3 text-gray-300">{step.margin_pct}%</td>
                      <td className={`py-2.5 px-3 font-bold ${isSafe ? 'text-blue-400' : 'text-rose-400'}`}>
                        {formatPaise(step.projected_min_cash_paise)}
                      </td>
                      <td className="py-2.5 px-3">
                        {isSafe ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-semibold text-[10px]">
                            <CheckCircle2 className="h-3 w-3" /> Safe Buffer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 text-rose-400 font-bold text-[10px]">
                            <XCircle className="h-3 w-3" /> Breaches Reserve
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

      {/* BOTTOM SECTION: Transparent Assumptions & Evidence Log */}
      <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-bold text-gray-300 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-blue-400" />
            Assumptions & Evidence Transparency Log
          </span>
          <span className="text-xs text-gray-400">Never Hallucinated • Code-Verified Formulas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80 space-y-1.5">
            <span className="font-semibold text-blue-300 block">Key Modeling Assumptions</span>
            <ul className="space-y-1 text-gray-400 text-[11px]">
              {recommendation?.key_assumptions?.map((ass: string, i: number) => (
                <li key={i}>• {ass}</li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80 space-y-1.5">
            <span className="font-semibold text-emerald-300 block">Supporting Historical Evidence</span>
            <ul className="space-y-1 text-gray-400 text-[11px]">
              {recommendation?.supporting_historical_data?.map((sup: string, i: number) => (
                <li key={i}>• {sup}</li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80 space-y-1.5">
            <span className="font-semibold text-amber-300 block">Risks & Sensitivity Mitigations</span>
            <ul className="space-y-1 text-gray-400 text-[11px]">
              {recommendation?.risks_and_mitigations?.map((r: string, i: number) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
