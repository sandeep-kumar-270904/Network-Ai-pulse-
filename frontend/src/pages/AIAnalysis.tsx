import React, { useState, useEffect } from 'react';
import {
  Play,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ShieldOff,
  RotateCcw,
} from 'lucide-react';
import {
  runAiAnomalyScan,
  executePingDiagnostic,
  toggleAnomalyFalsePositive,
} from '../services/api';
import {
  formatJitterMs,
  formatLatencyMs,
  formatPercent,
  formatRelativeTime,
  formatTimestampUtc,
} from '../utils/formatters';

export const AIAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);

  const handleScan = async () => {
    setLoading(true);
    const { analysis: res } = await runAiAnomalyScan();
    setAnalysis(res);
    setLoading(false);
  };

  const handleQuickBaselineAndScan = async () => {
    setSeeding(true);
    await executePingDiagnostic('192.168.1.1', 3);
    await executePingDiagnostic('1.1.1.1', 3);
    await executePingDiagnostic('8.8.8.8', 3);
    setSeeding(false);
    await handleScan();
  };

  const handleToggleFalsePositive = async (item: any) => {
    setUpdatingId(item.id);
    const nextState = !item.false_positive;
    const { analysis: updated } = await toggleAnomalyFalsePositive(
      item.id,
      nextState,
      nextState ? 'Marked as false positive via Anomaly Detection view' : ''
    );
    if (updated) {
      setAnalysis(updated);
    } else {
      await handleScan();
    }
    setUpdatingId(null);
  };

  useEffect(() => {
    handleScan();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {analysis?.threshold ? (
          <div className="text-[12px] font-mono text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-control)] px-3 py-2">
            Baseline thresholds: <span className="text-[var(--text)]">{analysis.threshold}</span>
          </div>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={handleScan}
          disabled={loading || seeding}
          className="h-10 flex items-center gap-2 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-[13px] font-semibold"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>{loading ? 'Scoring dataset…' : 'Run anomaly scan'}</span>
        </button>
      </div>

      {/* Summary Cards */}
      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">Active algorithm</div>
            <div className="text-[14px] font-semibold font-mono text-[var(--accent)] mt-1 leading-snug break-words">
              {analysis.model}
            </div>
          </div>
          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">Samples analyzed</div>
            <div className="text-[24px] font-semibold font-mono text-[var(--text)] mt-1 np-mono-val">
              {analysis.samples_analyzed ?? 'No data'}
            </div>
          </div>
          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">Active anomalies</div>
            <div
              className={`text-[24px] font-semibold font-mono mt-1 np-mono-val ${
                (analysis.anomalies_found ?? 0) > 0 ? 'text-[var(--warn)]' : 'text-[var(--ok)]'
              }`}
            >
              {analysis.anomalies_found ?? 0}
            </div>
            {(analysis.false_positives_count ?? 0) > 0 && (
              <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
                {analysis.false_positives_count} marked false positive
              </div>
            )}
          </div>
          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)]">
            <div className="text-[12px] font-medium text-[var(--text-secondary)]">Baseline mean RTT</div>
            <div className="text-[24px] font-semibold font-mono text-[var(--ok)] mt-1 np-mono-val">
              {formatLatencyMs(analysis.baseline_mean_rtt_ms)}
            </div>
          </div>
        </div>
      )}

      {/* Insufficient samples prompt */}
      {analysis?.status === 'need_more_samples' && (
        <div className="p-6 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-dashed border-[var(--border-strong)] text-center space-y-3">
          <Cpu className="w-8 h-8 text-[var(--accent)] mx-auto" />
          <div className="text-[13px] text-[var(--text-secondary)]">{analysis.message}</div>
          <button
            type="button"
            onClick={handleQuickBaselineAndScan}
            disabled={seeding}
            className="h-10 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] text-[var(--accent-ink)] text-[13px] font-semibold inline-flex items-center gap-2"
          >
            {seeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{seeding ? 'Running baseline pings…' : 'Run 3 baseline pings & score'}</span>
          </button>
        </div>
      )}

      {/* Anomaly Results Table */}
      {analysis?.results?.length > 0 && (
        <div className="p-5 rounded-[var(--radius-card)] bg-[var(--surface-1)] border border-[var(--border)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[14px] font-semibold text-[var(--text)]">
              Scored telemetry samples ({analysis.results.length})
            </h4>
            <span className="text-[12px] text-[var(--text-muted)]">
              Labels strictly align with statistical + IsolationForest rules
            </span>
          </div>
          <div className="overflow-x-auto rounded-[var(--radius-control)] border border-[var(--border)]">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[var(--surface-2)] text-[var(--text-secondary)] text-[12px] font-medium border-b border-[var(--border)]">
                <tr>
                  <th className="py-2.5 px-2.5">Recorded (UTC)</th>
                  <th className="py-2.5 px-2.5">Target</th>
                  <th className="py-2.5 px-2.5 text-right">Avg RTT</th>
                  <th className="py-2.5 px-2.5 text-right">Jitter</th>
                  <th className="py-2.5 px-2.5 text-right">Loss</th>
                  <th className="py-2.5 px-2.5 text-right">Conf.</th>
                  <th className="py-2.5 px-2.5">Classification</th>
                  <th className="py-2.5 px-2.5">Flag reason & threshold</th>
                  <th className="py-2.5 px-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-mono text-[12px] np-mono-val">
                {analysis.results.map((item: any) => {
                  const fullUtc = formatTimestampUtc(item.timestamp);
                  const [utcDate, ...restTime] = fullUtc.split(' ');
                  const utcTime = restTime.join(' ');
                  return (
                    <tr key={item.id} className="hover:bg-[var(--surface-2)]/60">
                      <td
                        className="py-2.5 px-2.5 text-[var(--text-secondary)] leading-tight"
                        title={`${fullUtc} (${formatRelativeTime(item.timestamp)})`}
                      >
                        {utcTime ? (
                          <>
                            <div className="whitespace-nowrap">{utcDate}</div>
                            <div className="whitespace-nowrap text-[11px] text-[var(--text-muted)]">{utcTime}</div>
                          </>
                        ) : (
                          <span>{fullUtc}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-[var(--accent)] font-semibold whitespace-nowrap">{item.target}</td>
                      <td className="py-2.5 px-2.5 text-right text-[var(--text)] whitespace-nowrap">
                        {formatLatencyMs(item.avg_rtt_ms)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-[var(--text-secondary)] whitespace-nowrap">
                        {formatJitterMs(item.jitter_ms)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-[var(--text-secondary)] whitespace-nowrap">
                        {formatPercent(item.packet_loss_pct)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-[var(--text)] whitespace-nowrap">
                        {item.confidence_pct !== undefined && item.confidence_pct !== null
                          ? `${item.confidence_pct}%`
                          : 'No data'}
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {item.classification === 'anomaly' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger)]/30 text-[12px] font-sans font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Anomaly</span>
                          </span>
                        ) : item.classification === 'false_positive' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-3)] text-[var(--text-secondary)] border border-[var(--border-strong)] text-[12px] font-sans font-medium">
                            <ShieldOff className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>False positive</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--ok-soft)] text-[var(--ok)] border border-[var(--ok)]/30 text-[12px] font-sans font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Normal</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2.5 text-[var(--text-secondary)] font-sans text-[12px] max-w-[230px]">
                        <div className="text-[var(--text)] leading-snug">{item.reason}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-sans">
                        {(item.classification === 'anomaly' || item.classification === 'false_positive') ? (
                          <button
                            type="button"
                            onClick={() => handleToggleFalsePositive(item)}
                            disabled={updatingId === item.id}
                            className="h-8 px-2.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border-strong)] text-[12px] text-[var(--text)] hover:bg-[var(--surface-3)] inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {item.false_positive ? (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 text-[var(--accent)]" />
                                <span>Restore</span>
                              </>
                            ) : (
                              <>
                                <ShieldOff className="w-3.5 h-3.5 text-[var(--warn)]" />
                                <span>False positive</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[12px] text-[var(--text-muted)]">—</span>
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
    </div>
  );
};
