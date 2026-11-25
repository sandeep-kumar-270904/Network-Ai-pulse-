import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, Trash2, Check, RefreshCw } from 'lucide-react';
import { fetchAlerts, acknowledgeAlert, clearAlerts } from '../services/api';

export const Alerts: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    setLoading(true);
    const { events: list } = await fetchAlerts(100);
    setEvents(list);
    setLoading(false);
  };

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(loadAlerts, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleAck = async (id: string) => {
    const ok = await acknowledgeAlert(id);
    if (ok) {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, acknowledged: true } : e)));
    }
  };

  const handleClear = async () => {
    await clearAlerts();
    loadAlerts();
  };

  const filteredEvents = events.filter((e) => filter === 'all' || e.level === filter);

  const levelBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-[#FF475F]/15 text-[#FF475F] border-[#FF475F]/30';
      case 'warning':
        return 'bg-[#F5B82E]/15 text-[#F5B82E] border-[#F5B82E]/30';
      case 'success':
        return 'bg-[#00D69A]/15 text-[#00D69A] border-[#00D69A]/30';
      default:
        return 'bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30';
    }
  };

  const levelIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-[#FF475F]" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#F5B82E]" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-[#00D69A]" />;
      default:
        return <Info className="w-4 h-4 text-[#22D3EE]" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-[var(--text-secondary)]">
          Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
        </span>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          {(['all', 'critical', 'warning', 'success', 'info'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`h-10 px-3 rounded-[var(--radius-control)] border capitalize transition-colors ${
                filter === lvl
                  ? 'bg-[var(--accent-soft)] text-[var(--text)] border-[var(--accent)]/40 font-semibold'
                  : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-3)]'
              }`}
            >
              {lvl}
            </button>
          ))}

          <button
            onClick={loadAlerts}
            className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] inline-flex items-center justify-center"
            aria-label="Refresh alerts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleClear}
            className="h-10 flex items-center gap-2 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--danger)] text-[13px]"
          >
            <Trash2 className="w-4 h-4" /> Clear
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            className={`p-4 rounded-xl bg-[#0D192B] border transition-colors flex flex-wrap items-center justify-between gap-3 font-mono text-xs ${
              evt.acknowledged ? 'border-[#203750]/50 opacity-65' : 'border-[#203750]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{levelIcon(evt.level)}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase border ${levelBadge(evt.level)}`}>
                    {evt.level}
                  </span>
                  <span className="text-[#EAF3FF] font-semibold">{evt.source}</span>
                  <span className="text-[10px] text-[#647C96]">
                    {evt.timestamp.replace('T', ' ').substring(0, 19)} UTC
                  </span>
                </div>
                <p className="text-[#91A7C0] text-[11px] mt-1">{evt.message}</p>
              </div>
            </div>

            {!evt.acknowledged ? (
              <button
                onClick={() => handleAck(evt.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#111E30] border border-[#203750] text-[#22D3EE] hover:border-[#22D3EE]/50 text-[10px]"
              >
                <Check className="w-3 h-3" /> Acknowledge
              </button>
            ) : (
              <span className="text-[10px] text-[#647C96]">Acknowledged</span>
            )}
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="p-8 text-center text-xs font-mono text-[#647C96] border border-dashed border-[#203750] rounded-xl">
            No operational alerts matching filter.
          </div>
        )}
      </div>
    </div>
  );
};
