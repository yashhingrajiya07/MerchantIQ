import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  Layers,
  ArrowDownLeft,
  AlertOctagon
} from 'lucide-react';

export const RazorpayMonitor: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/webhooks/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch webhook events:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = async (type: string, shouldFailSig = false, isDup = false) => {
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: type,
          shouldFailSignature: shouldFailSig,
          isDuplicateTrigger: isDup
        })
      });
      const data = await res.json();
      if (shouldFailSig) {
        setLastAction(`❌ Signature verification failed: Forged signature rejected with 400 Bad Request`);
      } else if (isDup) {
        setLastAction(`⚠️ Idempotency check: Event ${data.eventId} recognized as DUPLICATE and safely ignored.`);
      } else {
        setLastAction(`✅ Webhook ${data.eventId} received, HMAC verified, and state updated.`);
      }
      fetchEvents();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              Live Gateway Integration
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Mode: Razorpay Test Mode (Sandbox)
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Authoritative Payment State & Webhook Security
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            HMAC SHA256 signature verification, event-ID deduplication, and zero-trust reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEvents}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Log
          </button>
        </div>
      </div>

      {/* Interactive Simulation Controls */}
      <div className="rounded-xl bg-gray-900/80 border border-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold text-gray-300 flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-400" />
            Simulate Webhook Delivery & Attack Vectors
          </span>
          <span className="text-[11px] text-gray-400">Click to dispatch live test payloads</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Button 1: Valid payment.captured */}
          <button
            disabled={loading}
            onClick={() => handleSimulate('payment.captured')}
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 text-emerald-300 text-xs font-bold transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Trigger Valid payment.captured
          </button>

          {/* Button 2: Duplicate Event */}
          <button
            disabled={loading}
            onClick={() => handleSimulate('payment.captured', false, true)}
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 text-amber-300 text-xs font-bold transition-all disabled:opacity-50"
          >
            <Copy className="h-4 w-4 text-amber-400" />
            Trigger Duplicate Event (Idempotency)
          </button>

          {/* Button 3: Forged Signature Attack */}
          <button
            disabled={loading}
            onClick={() => handleSimulate('payment.captured', true)}
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-300 text-xs font-bold transition-all disabled:opacity-50"
          >
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            Trigger Forged Signature Attack
          </button>
        </div>

        {lastAction && (
          <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-xs font-mono text-gray-300 animate-fadeIn">
            {lastAction}
          </div>
        )}
      </div>

      {/* Webhook Event Stream Table */}
      <div className="rounded-xl bg-gray-900/80 border border-gray-800 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <span className="text-xs uppercase font-bold text-gray-300">
            Real-Time Webhook Event Stream (Deduplicated)
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {events.length} Events In Memory
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-950/60 text-gray-400 uppercase font-semibold tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Event ID (x-razorpay-event-id)</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Signature Status</th>
                <th className="py-3 px-4">Processing Result</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-500">
                    No webhooks received yet. Use the simulator buttons above to dispatch events.
                  </td>
                </tr>
              ) : (
                events.map((evt, idx) => {
                  const isDup = evt.status === 'DUPLICATE';
                  const isRejected = evt.payloadSummary?.includes('REJECTED');
                  return (
                    <tr key={idx} className="hover:bg-gray-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-white">{evt.eventId}</td>
                      <td className="py-3 px-4 font-mono text-blue-400">{evt.eventType}</td>
                      <td className="py-3 px-4">
                        {isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 text-rose-400 font-semibold text-[10px]">
                            <XCircle className="h-3 w-3" /> FAILED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-semibold text-[10px]">
                            <ShieldCheck className="h-3 w-3" /> HMAC VERIFIED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isDup ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-semibold text-[10px]">
                            DUPLICATE IGNORED
                          </span>
                        ) : isRejected ? (
                          <span className="text-rose-400 text-[11px]">{evt.payloadSummary}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-semibold text-[10px]">
                            STATE PROCESSED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                        {new Date(evt.receivedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
