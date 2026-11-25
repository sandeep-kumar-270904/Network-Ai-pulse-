import React, { useState, useEffect } from 'react';
import { Bot, Clock, Plus, Play, Pause, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';
import {
  fetchAutomationJobs,
  createAutomationJob,
  toggleAutomationJob,
  runAutomationJobNow,
  deleteAutomationJob,
} from '../services/api';

export const Automation: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastRunOutput, setLastRunOutput] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [target, setTarget] = useState('192.168.1.1');
  const [testType, setTestType] = useState('icmp_ping');
  const [intervalSec, setIntervalSec] = useState(60);

  const loadJobs = async () => {
    setLoading(true);
    const { jobs: data } = await fetchAutomationJobs();
    setJobs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();
    const timer = setInterval(loadJobs, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleToggle = async (id: string, current: boolean) => {
    const ok = await toggleAutomationJob(id, !current);
    if (ok) {
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, enabled: !current } : j)));
    }
  };

  const handleRunNow = async (id: string) => {
    setRunningId(id);
    setLastRunOutput(null);
    const { data, error } = await runAutomationJobNow(id);
    setRunningId(null);
    if (data) {
      setLastRunOutput(`Completed: ${data.summary}`);
      loadJobs();
    } else if (error) {
      setLastRunOutput(`Error: ${error}`);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !target.trim()) return;
    const { job } = await createAutomationJob(name, target, testType, intervalSec);
    if (job) {
      setJobs((prev) => [...prev, job]);
      setName('');
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteAutomationJob(id);
    if (ok) {
      setJobs((prev) => prev.filter((j) => j.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-10 flex items-center gap-2 px-4 rounded-[var(--radius-control)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-[13px] font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>New schedule</span>
        </button>
      </div>

      {lastRunOutput && (
        <div className="p-3 rounded-lg bg-[#0D192B] border border-[#22D3EE]/40 text-xs font-mono text-[#22D3EE]">
          {lastRunOutput}
        </div>
      )}

      {/* Jobs Table */}
      <div className="p-5 rounded-xl bg-[#0D192B] border border-[#203750] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#EAF3FF] font-mono flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#22D3EE]" /> Scheduled Probe Routines ({jobs.length})
          </h3>
          <button
            onClick={loadJobs}
            className="p-1.5 rounded bg-[#111E30] border border-[#203750] text-[#91A7C0] hover:text-[#EAF3FF]"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#203750]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#111E30] text-[#91A7C0] uppercase text-[10px] tracking-wider border-b border-[#203750]">
              <tr>
                <th className="py-2.5 px-4">Routine Name</th>
                <th className="py-2.5 px-4">Target</th>
                <th className="py-2.5 px-4">Protocol</th>
                <th className="py-2.5 px-4">Interval</th>
                <th className="py-2.5 px-4">Runs</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#203750]/50">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-[#13243A]/40 transition-colors">
                  <td className="py-3 px-4 text-[#EAF3FF] font-semibold">{job.name}</td>
                  <td className="py-3 px-4 text-[#22D3EE]">{job.target}</td>
                  <td className="py-3 px-4 text-[#91A7C0] uppercase text-[10px]">{job.test_type}</td>
                  <td className="py-3 px-4 text-[#91A7C0]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#647C96]" /> {job.interval_seconds}s
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#EAF3FF]">{job.run_count}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase border ${
                        job.enabled
                          ? 'bg-[#00D69A]/10 text-[#00D69A] border-[#00D69A]/30'
                          : 'bg-[#647C96]/10 text-[#91A7C0] border-[#203750]'
                      }`}
                    >
                      {job.enabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => handleToggle(job.id, job.enabled)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#111E30] border border-[#203750] text-[#EAF3FF] hover:border-[#22D3EE]/50 text-[10px]"
                      title={job.enabled ? 'Pause background schedule' : 'Enable background schedule'}
                    >
                      {job.enabled ? <Pause className="w-3 h-3 text-[#F5B82E]" /> : <Play className="w-3 h-3 text-[#00D69A]" />}
                      <span>{job.enabled ? 'Pause' : 'Enable'}</span>
                    </button>
                    <button
                      onClick={() => handleRunNow(job.id)}
                      disabled={runningId === job.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#287EFF]/20 border border-[#287EFF]/40 text-[#22D3EE] hover:bg-[#287EFF]/30 text-[10px]"
                    >
                      <RefreshCw className={`w-3 h-3 ${runningId === job.id ? 'animate-spin' : ''}`} />
                      <span>Run Now</span>
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="p-1 rounded text-[#647C96] hover:text-[#FF475F]"
                      title="Delete job"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-xl bg-[#0D192B] border border-[#22D3EE]/40 shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-[#EAF3FF] font-mono uppercase">Create Scheduled Probe</h4>
            <form onSubmit={handleCreate} className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-[#91A7C0] mb-1">Job Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloudflare Health Check"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#111E30] border border-[#203750] text-[#EAF3FF]"
                />
              </div>
              <div>
                <label className="block text-[#91A7C0] mb-1">Target IP / Host</label>
                <input
                  type="text"
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#111E30] border border-[#203750] text-[#EAF3FF]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#91A7C0] mb-1">Probe Type</label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#111E30] border border-[#203750] text-[#EAF3FF]"
                  >
                    <option value="icmp_ping">ICMP Ping</option>
                    <option value="tcp_probe">TCP Port 443</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#91A7C0] mb-1">Interval (15-3600s)</label>
                  <input
                    type="number"
                    min="15"
                    max="3600"
                    value={intervalSec}
                    onChange={(e) => setIntervalSec(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded bg-[#111E30] border border-[#203750] text-[#EAF3FF]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded bg-[#13243A] text-[#91A7C0]">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-[#287EFF] text-white font-semibold">
                  Create & Enable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
