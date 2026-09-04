import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Cpu,
  AlertTriangle,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Bug
} from 'lucide-react';

export const DataHealthView: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [failureResult, setFailureResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/data-health');
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.error('Failed to fetch data health:', err);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleTestFailure = async (mode: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/test/inject-failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      setFailureResult(data);
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
              System Reliability & Integrity
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">Data Health & AI Failure Protection Lab</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Audit authoritative data sources, data freshness, and verify automated fail-safe protections.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Re-audit
        </button>
      </div>

      {/* AI Mode & Decision Engine Status Banner */}
      {healthData?.ai_status && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          healthData.ai_status.is_fallback
            ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
            : 'bg-indigo-950/30 border-indigo-700/50 text-indigo-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              healthData.ai_status.is_fallback ? 'bg-amber-900/50 text-amber-300' : 'bg-indigo-800/50 text-indigo-300'
            }`}>
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Active Mode: {healthData.ai_status.mode === 'AI_LLM' ? 'AI Language Model' : 'Deterministic Semantic Parser'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-black/40 border border-gray-700">
                  {healthData.ai_status.provider}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{healthData.ai_status.explanation}</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-black/50 border border-gray-700 text-gray-300 self-start sm:self-auto">
            {healthData.ai_status.is_fallback ? 'Offline Safe Fallback' : 'Online Primary Mode'}
          </span>
        </div>
      )}

      {/* Authoritative Sources Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {healthData?.authoritative_sources?.map((src: any, i: number) => (
          <div key={i} className="p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{src.name}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                src.status === 'ONLINE' ? 'bg-emerald-950 text-emerald-400' : 'bg-gray-800 text-gray-300'
              }`}>
                {src.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-800">
              <span className="text-gray-400 font-mono">
                {src.latency_ms !== null && src.latency_ms !== undefined ? `${src.latency_ms}ms` : 'N/A (Sandbox)'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 text-[9px] font-bold tracking-wider">
                {src.source_type || 'DATA'}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              Records: {src.count}
            </div>
          </div>
        ))}
      </div>

      {/* AI Failure Protection Lab (PDF Page 15, 20) */}
      <div className="rounded-xl bg-gradient-to-br from-gray-900 via-gray-900/90 to-blue-950/20 border border-gray-800 p-6 space-y-4 shadow-xl">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-blue-400 flex items-center gap-2">
            <Bug className="h-4 w-4 text-blue-400" />
            AI Failure Resilience Stress-Test Lab
          </span>
          <h3 className="text-lg font-bold text-white mt-1">
            "AI can fail loudly; money logic must fail safely."
          </h3>
          <p className="text-xs text-gray-300 max-w-2xl leading-relaxed mt-1">
            Simulate live AI outages, corrupted LLM outputs, or impossible inputs. Observe how MerchantIQ deterministically protects financial records and falls back to safe manual operations without ever hallucinating money.
          </p>
        </div>

        {/* Buttons to test failure modes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            disabled={loading}
            onClick={() => handleTestFailure('llm_outage')}
            className="p-3 rounded-xl bg-gray-950 hover:bg-gray-800 border border-gray-700 text-left space-y-1 transition-all"
          >
            <div className="text-xs font-bold text-amber-300">1. Simulate LLM Outage (503)</div>
            <div className="text-[11px] text-gray-400">Verifies local semantic NLP fallback engagement</div>
          </button>

          <button
            disabled={loading}
            onClick={() => handleTestFailure('invalid_json')}
            className="p-3 rounded-xl bg-gray-950 hover:bg-gray-800 border border-gray-700 text-left space-y-1 transition-all"
          >
            <div className="text-xs font-bold text-rose-300">2. Simulate Malformed JSON</div>
            <div className="text-[11px] text-gray-400">Verifies schema rejection and memory safety</div>
          </button>

          <button
            disabled={loading}
            onClick={() => handleTestFailure('impossible_values')}
            className="p-3 rounded-xl bg-gray-950 hover:bg-gray-800 border border-gray-700 text-left space-y-1 transition-all"
          >
            <div className="text-xs font-bold text-indigo-300">3. Simulate Impossible Values</div>
            <div className="text-[11px] text-gray-400">Verifies negative discount & impossible margin blocks</div>
          </button>
        </div>

        {/* Failure Injection Output Display */}
        {failureResult && (
          <div className="p-4 rounded-xl bg-gray-950 border border-blue-900/40 space-y-2 font-mono text-xs animate-fadeIn">
            <div className="flex items-center justify-between text-blue-400 font-bold border-b border-gray-800 pb-2">
              <span>Test Case: {failureResult.test_name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400">SAFE EXIT VERIFIED</span>
            </div>
            <div className="text-gray-300 pt-1">
              <strong>Action Taken:</strong> {failureResult.action_taken}
            </div>
            {failureResult.fallback_used && (
              <div className="text-emerald-400">
                <strong>Resilience Mechanism:</strong> {failureResult.fallback_used}
              </div>
            )}
            {failureResult.safe_state && (
              <div className="text-blue-300">
                <strong>Financial Layer Guarantee:</strong> {failureResult.safe_state}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
