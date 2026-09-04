import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { DecisionWorkspace } from './components/DecisionWorkspace';
import { RazorpayMonitor } from './components/RazorpayMonitor';
import { DecisionHistoryView } from './components/DecisionHistoryView';
import { DataHealthView } from './components/DataHealthView';
import { ScenarioModal } from './components/ScenarioModal';
import { MerchantDataCenter } from './components/MerchantDataCenter';

import { TimeframeOption } from '@merchantiq/data-model';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('1M');
  const [summary, setSummary] = useState<any>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [currentDecision, setCurrentDecision] = useState<any | null>(null);
  const [selectedScenarioForModal, setSelectedScenarioForModal] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [demoSubtitle, setDemoSubtitle] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    (window as any).__setDemoSubtitle = (text: string | null) => setDemoSubtitle(text);
    fetchSummary('1M');
    fetchPresets();
    loadDefaultDecision();
  }, []);

  const fetchSummary = async (tf: TimeframeOption = selectedTimeframe) => {
    try {
      const res = await fetch(`/api/merchant/summary?timeframe=${tf}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    }
  };

  const handleSelectTimeframe = (tf: TimeframeOption) => {
    setSelectedTimeframe(tf);
    fetchSummary(tf);
  };

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/demo/presets');
      if (res.ok) {
        const data = await res.json();
        setPresets(data);
      }
    } catch (err) {
      console.error('Failed to load demo presets:', err);
    }
  };

  const loadDefaultDecision = async () => {
    try {
      const res = await fetch('/api/decisions');
      if (res.ok) {
        const list = await res.json();
        if (list.length > 0) {
          setCurrentDecision(list[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load default decision:', err);
    }
  };

  const handleAskQuestion = async (question: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      if (res.ok) {
        const newDecision = await res.json();
        setCurrentDecision(newDecision);
        setActiveTab('workspace');
        fetchSummary();
      }
    } catch (err) {
      console.error('Error creating decision simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = async (presetId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/demo/run-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId })
      });
      if (res.ok) {
        const decision = await res.json();
        setCurrentDecision(decision);
        setActiveTab('workspace');
        fetchSummary();
      }
    } catch (err) {
      console.error('Error running demo preset:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConstraints = async (minCash: number, minMargin: number) => {
    if (!currentDecision) return;
    setLoading(true);
    try {
      // 1. Update merchant global constraints
      await fetch('/api/merchant/constraints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minimum_cash: minCash,
          minimum_margin_pct: minMargin
        })
      });

      // 2. Re-simulate the current decision with updated constraints
      const updatedDecision = {
        ...currentDecision,
        parsed_request: {
          ...currentDecision.parsed_request,
          constraints: {
            ...currentDecision.parsed_request.constraints,
            minimum_cash: minCash,
            minimum_cash_paise: minCash * 100,
            minimum_margin_pct: minMargin
          }
        }
      };

      // Call simulate endpoint
      const res = await fetch(`/api/decisions/${currentDecision.id}/simulate`, {
        method: 'POST'
      });
      if (res.ok) {
        const refreshed = await res.json();
        setCurrentDecision(refreshed);
      }
    } catch (err) {
      console.error('Error updating constraints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDecision = async (decisionId: string) => {
    try {
      const res = await fetch(`/api/decisions/${decisionId}`);
      if (res.ok) {
        const dec = await res.json();
        setCurrentDecision(dec);
        setActiveTab('workspace');
      }
    } catch (err) {
      console.error('Error opening decision:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cashPaise={summary?.metrics?.current_cash_paise || 80000000}
        aiStatus={summary?.ai_status}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            summary={summary}
            selectedTimeframe={selectedTimeframe}
            onSelectTimeframe={handleSelectTimeframe}
            onAskQuestion={handleAskQuestion}
            onSelectPreset={handleSelectPreset}
            presets={presets}
            loading={loading}
          />
        )}

        {activeTab === 'datacenter' && (
          <MerchantDataCenter onDataChanged={() => fetchSummary(selectedTimeframe)} />
        )}

        {activeTab === 'workspace' && (
          <DecisionWorkspace
            decision={currentDecision}
            onUpdateConstraints={handleUpdateConstraints}
            onSelectScenarioForModal={setSelectedScenarioForModal}
            loading={loading}
          />
        )}

        {activeTab === 'razorpay' && <RazorpayMonitor />}

        {activeTab === 'history' && (
          <DecisionHistoryView onSelectDecision={handleSelectDecision} />
        )}

        {activeTab === 'safety' && <DataHealthView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 bg-[#090D17] py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-medium text-gray-400">
            MerchantIQ — AI-Powered Merchant Decision Simulator • Razorpay AI Buildathon 2026 (Open Track)
          </p>
          <p className="text-[11px] text-gray-400">
            “Before you make a business decision, simulate its consequences.” The merchant remains the final decision-maker.
          </p>
        </div>
      </footer>

      {/* Detailed Scenario Formula & Trajectory Inspector Modal */}
      {selectedScenarioForModal && (
        <ScenarioModal
          scenario={selectedScenarioForModal}
          onClose={() => setSelectedScenarioForModal(null)}
        />
      )}

      {/* Synchronized Buildathon Presentation Subtitle Banner */}
      {demoSubtitle && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-[100] max-w-xl w-auto px-6 py-3 rounded-xl bg-[#070b14]/95 border border-blue-500/60 text-white shadow-2xl backdrop-blur-md text-center transition-all duration-300 animate-fadeIn pointer-events-none">
          <div className="text-[10px] uppercase font-bold tracking-widest text-blue-400 mb-0.5">
            MerchantIQ • Live Walkthrough
          </div>
          <div className="text-sm font-semibold text-slate-100 drop-shadow">{demoSubtitle}</div>
        </div>
      )}
    </div>
  );
};

export default App;
