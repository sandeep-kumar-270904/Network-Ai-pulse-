import React from 'react';
import { Router, Server, Cpu, Radio } from 'lucide-react';
import { TopologyGraph } from '../components/topology/TopologyGraph';
import { ThemeMode } from '../components/ui/ThemeToggle';

interface TopologyProps {
  theme?: ThemeMode;
  timeRange?: string;
}

export const Topology: React.FC<TopologyProps> = ({ theme = 'dark', timeRange = '1h' }) => {
  return (
    <div className="space-y-6">
      <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
        <TopologyGraph theme={theme} timeRange={timeRange} />
      </div>

      {/* Legend matching exact graph node icons & edge states */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
          <h3 className="text-[13px] font-semibold text-[var(--text)]">Link health states</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
            <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-2.5">
              <span className="w-6 h-0.5 bg-[var(--ok)] shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="font-medium text-[var(--text)]">Healthy link</div>
                <div className="text-[var(--text-muted)]">0% loss · active RTT</div>
              </div>
            </div>
            <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-2.5">
              <span className="w-6 h-0.5 bg-[var(--warn)] shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <div className="font-medium text-[var(--text)]">Degraded link</div>
                <div className="text-[var(--text-muted)]">Partial loss or slow</div>
              </div>
            </div>
            <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-2.5">
              <span
                className="w-6 border-t-2 border-dashed border-[var(--danger)] shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="font-medium text-[var(--text)]">Failing link</div>
                <div className="text-[var(--text-muted)]">100% loss / timeout</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
          <h3 className="text-[13px] font-semibold text-[var(--text)]">Node roles</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 text-[12px]">
            <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-2">
              <Router className="w-4 h-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
              <span className="font-medium text-[var(--text)]">Gateway</span>
            </div>
            <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-2">
              <Server className="w-4 h-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
              <span className="font-medium text-[var(--text)]">Host</span>
            </div>
            <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
              <span className="font-medium text-[var(--text)]">LAN peer</span>
            </div>
            <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[var(--accent)] shrink-0" aria-hidden="true" />
              <span className="font-medium text-[var(--text)]">Probe target</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
