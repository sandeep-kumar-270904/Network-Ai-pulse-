import React, { useState, useEffect } from 'react';
import { Settings, Shield, Globe, Save, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [gatewayUrl, setGatewayUrl] = useState(
    () => localStorage.getItem('netpulse_gateway_url') || API_BASE_URL
  );
  const [pollingCadence, setPollingCadence] = useState(
    () => Number(localStorage.getItem('netpulse_polling_sec')) || 5
  );
  const [enforcePassive, setEnforcePassive] = useState(
    () => localStorage.getItem('netpulse_passive_only') !== 'false'
  );
  const [requireConfirmation, setRequireConfirmation] = useState(
    () => localStorage.getItem('netpulse_confirm_probes') !== 'false'
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Sync defaults on initial mount if unset
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('netpulse_gateway_url', gatewayUrl);
    localStorage.setItem('netpulse_polling_sec', String(pollingCadence));
    localStorage.setItem('netpulse_passive_only', String(enforcePassive));
    localStorage.setItem('netpulse_confirm_probes', String(requireConfirmation));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0D192B] border border-[#203750]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#22D3EE]" /> Platform & Telemetry Configuration
          </h2>
          <p className="text-xs text-[#91A7C0] mt-0.5">
            Configure FastAPI gateway binding, telemetry sampling cadence, and operational safety policies.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Gateway Connection */}
        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#287EFF]" /> REST Gateway Binding
            </h3>
            <span className="text-[10px] font-mono text-[#647C96]">FASTAPI CORE</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-[#91A7C0] mb-1">Backend Core Base URL</label>
              <input
                type="text"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#111E30] border border-[#203750] text-[#EAF3FF] focus:border-[#22D3EE] focus:outline-none"
              />
              <p className="text-[11px] text-[#647C96] mt-1">
                Local FastAPI Uvicorn server running on localhost port 8000.
              </p>
            </div>

            <div>
              <label className="block text-[#91A7C0] mb-1">
                Telemetry Health Polling Interval ({pollingCadence} seconds)
              </label>
              <input
                type="range"
                min="2"
                max="30"
                value={pollingCadence}
                onChange={(e) => setPollingCadence(Number(e.target.value))}
                className="w-full accent-[#22D3EE] bg-[#111E30]"
              />
              <div className="flex justify-between text-[10px] text-[#647C96]">
                <span>2s (High Frequency)</span>
                <span>5s (Default)</span>
                <span>30s (Low Power)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Safety Constraints */}
        <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#203750]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00D69A]" /> Network Safety Policies
            </h3>
            <span className="text-[10px] font-mono text-[#00D69A]">ENFORCED</span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 p-3 rounded-lg bg-[#111E30] border border-[#203750] cursor-pointer hover:border-[#287EFF]/40 transition-colors">
              <input
                type="checkbox"
                checked={enforcePassive}
                onChange={(e) => setEnforcePassive(e.target.checked)}
                className="w-4 h-4 accent-[#22D3EE] rounded"
              />
              <div>
                <span className="font-mono font-semibold text-[#EAF3FF] block">
                  Enforce Passive Local Enumeration
                </span>
                <span className="text-[11px] text-[#91A7C0]">
                  Strictly prohibits unauthorized external subnet port sweeps; relies on kernel ARP cache and local routing tables.
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-[#111E30] border border-[#203750] cursor-pointer hover:border-[#287EFF]/40 transition-colors">
              <input
                type="checkbox"
                checked={requireConfirmation}
                onChange={(e) => setRequireConfirmation(e.target.checked)}
                className="w-4 h-4 accent-[#22D3EE] rounded"
              />
              <div>
                <span className="font-mono font-semibold text-[#EAF3FF] block">
                  Require Manual Target Selection for Active Socket Probes
                </span>
                <span className="text-[11px] text-[#91A7C0]">
                  Ensures ICMP, TCP handshake, and traceroute probes only run against explicit operator-approved targets.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Save Controls */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-xs font-mono text-[#00D69A] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Settings saved to browser storage
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#287EFF] hover:bg-[#168BFF] text-white text-xs font-medium font-mono shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
