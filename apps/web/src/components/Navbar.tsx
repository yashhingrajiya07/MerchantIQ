import React from 'react';
import {
  Layers,
  Activity,
  CreditCard,
  History,
  ShieldCheck,
  Zap,
  TrendingUp,
  Cpu,
  Database
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cashPaise: number;
  aiStatus?: {
    mode: string;
    provider: string;
    is_fallback: boolean;
    description: string;
  };
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, cashPaise, aiStatus }) => {
  const tabs = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: Activity },
    { id: 'datacenter', label: 'Merchant Data Center', icon: Database },
    { id: 'workspace', label: 'Decision Workspace', icon: Layers },
    { id: 'razorpay', label: 'Razorpay Monitor', icon: CreditCard },
    { id: 'history', label: 'Decision History', icon: History },
    { id: 'safety', label: 'Data & Safety Lab', icon: ShieldCheck },
  ];

  const formattedCash = `₹${(cashPaise / 10000000).toFixed(2)}L`;

  return (
    <header className="border-b border-gray-800 bg-[#0E1322]/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Product Identity */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">MerchantIQ</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  Decision Simulator
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">Razorpay AI Buildathon • Open Track</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Status Badge & Merchant Context */}
          <div className="flex items-center gap-3">
            {/* Explicit AI Mode Indicator */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                aiStatus?.is_fallback
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                  : 'bg-indigo-950/60 text-indigo-300 border-indigo-700/60'
              }`}
              title={aiStatus?.description || 'AI Decision Parsing Mode'}
            >
              <Cpu className="h-3 w-3" />
              <span>{aiStatus?.is_fallback ? 'Fallback Heuristic NLP' : `AI: ${aiStatus?.provider || 'LLM'}`}</span>
            </div>

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Current Cash</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{formattedCash}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-[11px] font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">Razorpay Test Mode</span>
              <span className="sm:hidden">Test</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden flex overflow-x-auto border-t border-gray-800/80 px-2 py-1 space-x-1 bg-[#090D17]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-400'
              }`}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
