import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, Globe, Shield, Activity } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  gatewayLatencyMs?: number;
  backendOnline: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  gatewayLatencyMs,
  backendOnline,
  onRefresh,
  isRefreshing = false,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-[#0D192B]/80 backdrop-blur-md border-b border-[#203750] px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Title & Context */}
      <div>
        <h1 className="text-lg font-bold text-[#EAF3FF] tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-[#91A7C0]">{subtitle}</p>}
      </div>

      {/* Operations Telemetry Bar */}
      <div className="flex items-center gap-4">
        {/* Environment Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111E30] border border-[#203750] text-[11px] font-mono text-[#91A7C0]">
          <Shield className="w-3 h-3 text-[#22D3EE]" />
          <span>ENV: LAB-ACTIVE</span>
        </div>

        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111E30] border border-[#203750] text-[11px] font-mono text-[#91A7C0]">
          <Clock className="w-3 h-3 text-[#287EFF]" />
          <span>{timeStr || '---'}</span>
        </div>

        {/* Gateway Health Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#13243A] border border-[#203750] text-xs font-mono">
          <Activity
            className={`w-3.5 h-3.5 ${
              backendOnline ? 'text-[#00D69A]' : 'text-[#FF475F]'
            }`}
          />
          <span className="text-[#91A7C0] text-[11px]">GATEWAY:</span>
          <span
            className={`font-semibold text-[11px] ${
              backendOnline ? 'text-[#00D69A]' : 'text-[#FF475F]'
            }`}
          >
            {backendOnline
              ? `${gatewayLatencyMs !== undefined ? `${gatewayLatencyMs}ms` : 'NOMINAL'}`
              : 'OFFLINE'}
          </span>
        </div>

        {/* Manual Refresh Trigger */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#13243A] hover:bg-[#203750] text-[#EAF3FF] border border-[#203750] text-xs font-medium transition-colors disabled:opacity-50"
          title="Force telemetry refresh"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-[#22D3EE] ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
          <span className="hidden sm:inline">Sync</span>
        </button>
      </div>
    </header>
  );
};
