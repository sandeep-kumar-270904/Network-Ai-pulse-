import React, { useState } from 'react';
import {
  Activity,
  Server,
  Shield,
  Zap,
  Globe,
  Info,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { TextInput } from '../components/ui/TextInput';
import { Select } from '../components/ui/Select';
import { Switch } from '../components/ui/Switch';
import { Tabs } from '../components/ui/Tabs';
import { StatusChip } from '../components/ui/StatusChip';
import { Card } from '../components/ui/Card';
import { DataTable, DataColumn, TableDensity } from '../components/ui/DataTable';
import { Tooltip } from '../components/ui/Tooltip';
import { Dialog } from '../components/ui/Dialog';
import { SideDrawer } from '../components/ui/SideDrawer';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { KpiCard } from '../components/dashboard/KpiCard';
import { CopyButton } from '../components/ui/CopyButton';
import { Slider } from '../components/ui/Slider';
import { useToast } from '../components/ui/Toast';
import { ThemeMode } from '../components/ui/ThemeToggle';

interface SampleRow {
  id: string;
  host: string;
  ip: string;
  avgRttMs: number;
  lossPct: number;
  status: 'ok' | 'warn' | 'danger';
}

const SAMPLE_ROWS: SampleRow[] = [
  { id: 'r1', host: 'Gateway router', ip: '192.168.1.1', avgRttMs: 1.4, lossPct: 0.0, status: 'ok' },
  { id: 'r2', host: 'Cloudflare DNS', ip: '1.1.1.1', avgRttMs: 31.2, lossPct: 0.0, status: 'ok' },
  { id: 'r3', host: 'Edge relay 02', ip: '198.51.100.14', avgRttMs: 142.8, lossPct: 2.5, status: 'warn' },
  { id: 'r4', host: 'Lab sensor node', ip: '192.168.1.44', avgRttMs: 0.0, lossPct: 100.0, status: 'danger' },
];

interface DesignSystemProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const DesignSystemPage: React.FC<DesignSystemProps> = ({ theme, onToggleTheme }) => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'controls' | 'data' | 'overlays'>('controls');
  const [segTab, setSegTab] = useState<'all' | 'healthy' | 'alerts'>('all');
  const [inputVal, setInputVal] = useState('http://127.0.0.1:8000');
  const [selectVal, setSelectVal] = useState('icmp');
  const [switchA, setSwitchA] = useState(true);
  const [switchB, setSwitchB] = useState(false);
  const [sliderVal, setSliderVal] = useState(5);
  const [density, setDensity] = useState<TableDensity>('comfortable');
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns: DataColumn<SampleRow>[] = [
    {
      key: 'host',
      header: 'Endpoint',
      sortable: true,
      render: (r) => <span className="font-medium text-[var(--text)]">{r.host}</span>,
    },
    {
      key: 'ip',
      header: 'IP address',
      sortable: true,
      render: (r) => <span className="np-mono-val text-[var(--text-secondary)]">{r.ip}</span>,
    },
    {
      key: 'avgRttMs',
      header: 'Avg RTT (ms)',
      numeric: true,
      sortable: true,
      render: (r) => (
        <span className="text-[var(--text)]">
          {r.status === 'danger' ? '—' : r.avgRttMs.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'lossPct',
      header: 'Loss (%)',
      numeric: true,
      sortable: true,
      render: (r) => (
        <span className={r.lossPct > 0 ? 'text-[var(--danger)]' : 'text-[var(--ok)]'}>
          {r.lossPct.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <StatusChip
          size="sm"
          tone={r.status}
          label={r.status === 'ok' ? 'Healthy' : r.status === 'warn' ? 'Degraded' : 'Unreachable'}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Gallery Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <Tabs
          ariaLabel="Component gallery sections"
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'controls', label: 'Controls & Inputs' },
            { id: 'data', label: 'KPIs, Table & States' },
            { id: 'overlays', label: 'Modals, Drawer & Toasts' },
          ]}
        />

        <div className="flex items-center gap-2">
          <StatusChip
            size="sm"
            tone="accent"
            label={`Active theme: ${theme === 'dark' ? 'Dark' : 'Light'}`}
          />
          <Button variant="secondary" onClick={onToggleTheme}>
            Switch to {theme === 'dark' ? 'Light' : 'Dark'}
          </Button>
        </div>
      </div>

      {/* 1. Controls & Inputs */}
      {activeTab === 'controls' && (
        <div className="space-y-6">
          <Card
            title="Buttons & Copy action"
            description="All interactive variants with default, hover, pressed, focus, disabled, and loading states (minimum 40px height)."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary action</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive" leftIcon={<Trash2 className="w-4 h-4" />}>
                  Destructive
                </Button>
                <Button variant="primary" loading>
                  Saving…
                </Button>
                <Button variant="secondary" disabled>
                  Disabled
                </Button>
                <CopyButton value="192.168.1.1" label="Copy IP" />
              </div>
            </div>
          </Card>

          <Card
            title="Inputs, Select & Tabs"
            description="Validation states and keyboard-accessible segmented controls."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                id="gal-input-default"
                label="Default & valid input"
                helper="Standard 40px text input with monospace data styling."
              >
                <TextInput
                  id="gal-input-default"
                  mono
                  leftIcon={<Globe className="w-4 h-4" />}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                />
              </Field>

              <Field
                id="gal-input-error"
                label="Error state"
                error="Unable to reach server. Verify the host address and port."
              >
                <TextInput
                  id="gal-input-error"
                  mono
                  invalid
                  value="http://invalid-host"
                  onChange={() => {}}
                />
              </Field>

              <Field
                id="gal-input-success"
                label="Success & disabled"
                success="Connected · 7 ms · v1.0.0"
              >
                <TextInput
                  id="gal-input-success"
                  mono
                  disabled
                  value="http://127.0.0.1:8000"
                  onChange={() => {}}
                />
              </Field>

              <Field id="gal-select" label="Protocol selector">
                <Select
                  id="gal-select"
                  value={selectVal}
                  onChange={(e) => setSelectVal(e.target.value)}
                >
                  <option value="icmp">ICMP Echo</option>
                  <option value="tcp">TCP Handshake (Port 443)</option>
                  <option value="trace">Traceroute</option>
                </Select>
              </Field>
            </div>

            <div className="pt-2 space-y-2">
              <span className="np-field-label block">Segmented tabs</span>
              <Tabs
                variant="segmented"
                ariaLabel="Filter status"
                value={segTab}
                onChange={setSegTab}
                tabs={[
                  { id: 'all', label: 'All endpoints', count: 12 },
                  { id: 'healthy', label: 'Healthy', count: 10 },
                  { id: 'alerts', label: 'Alerts', count: 2 },
                ]}
              />
            </div>
          </Card>

          <Card
            title="Toggle switches, Slider & Status chips"
            description="Every status conveys state with color, icon shape, and plain text."
          >
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <StatusChip tone="ok" label="Healthy" />
              <StatusChip tone="warn" label="Degraded" />
              <StatusChip tone="danger" label="Unreachable" />
              <StatusChip tone="info" label="Scheduled" />
              <StatusChip tone="accent" label="Selected" />
              <StatusChip tone="neutral" label="Lab" />
              <StatusChip size="xs" tone="ok" label="LIVE" pulseWhenLiveOrDegraded />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Switch
                checked={switchA}
                onChange={setSwitchA}
                title="Passive local enumeration"
                description="Enabled row with accessible 44x24 switch."
              />
              <Switch
                checked={switchB}
                onChange={setSwitchB}
                disabled
                title="Locked policy"
                description="Disabled read-only switch state."
              />
            </div>

            <div className="pt-2">
              <Slider
                value={sliderVal}
                min={2}
                max={30}
                ticks={[
                  { value: 2, label: '2s' },
                  { value: 5, label: 'Default' },
                  { value: 10, label: '10s' },
                  { value: 15, label: '15s' },
                  { value: 30, label: '30s' },
                ]}
                minLabel="Faster · more load"
                maxLabel="Slower · less load"
                ariaLabel="Gallery slider"
                onChange={setSliderVal}
              />
            </div>
          </Card>
        </div>
      )}

      {/* 2. KPIs, Table & States */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Gateway latency"
              value="1.4"
              unit="ms"
              subtext="192.168.1.1 nominal"
              icon={Activity}
              status="nominal"
              delta={{ direction: 'down', value: '0.2ms', sentiment: 'good' }}
              sparkline={[1.9, 1.8, 1.6, 1.5, 1.4, 1.4]}
            />
            <KpiCard
              label="Packet loss"
              value="2.5"
              unit="%"
              subtext="Threshold < 1.0%"
              icon={Zap}
              status="warning"
              delta={{ direction: 'up', value: '1.5%', sentiment: 'bad' }}
              sparkline={[0, 0, 0.5, 1.0, 2.0, 2.5]}
            />
            <KpiCard
              label="Unreachable nodes"
              value="1"
              unit="host"
              subtext="192.168.1.44 timed out"
              icon={Server}
              status="critical"
              sparkline={[0, 0, 0, 1, 1, 1]}
            />
            <KpiCard
              label="Monitored targets"
              value="4"
              unit="nodes"
              subtext="Local subnet + DNS"
              icon={Shield}
              status="neutral"
            />
          </div>

          <Card
            title="Sortable data table"
            description="Sticky header, right-aligned numeric columns with tabular numerals, and density toggle."
          >
            <DataTable
              columns={columns}
              data={SAMPLE_ROWS}
              rowKey={(r) => r.id}
              density={density}
              onDensityChange={setDensity}
              showDensityToggle
              caption="Sample endpoint telemetry table"
            />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Skeleton loader">
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-5/6" />
              </div>
            </Card>

            <Card title="Empty state">
              <EmptyState
                title="No diagnostic runs recorded"
                description="Run a latency or port check to populate the telemetry history."
                actionLabel="Run baseline check"
                onAction={() => addToast({ tone: 'info', title: 'Baseline check triggered' })}
              />
            </Card>
          </div>

          <ErrorState
            title="Gateway connection interrupted"
            message="The backend did not respond within 4 seconds."
            hint="Verify the local service is running on port 8000 and retry."
            onRetry={() => addToast({ tone: 'ok', title: 'Retry dispatched' })}
          />
        </div>
      )}

      {/* 3. Modals, Drawer & Toasts */}
      {activeTab === 'overlays' && (
        <Card
          title="Overlays, tooltips & notifications"
          description="Accessible focus-trapped dialogs, slide-over drawers, delayed tooltips, and auto-pausing toasts."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="destructive" onClick={() => setModalOpen(true)}>
              Open confirmation modal
            </Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              Open side drawer
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                addToast({
                  tone: 'ok',
                  title: 'Configuration saved',
                  description: 'Applied polling interval and policy rules.',
                })
              }
            >
              Trigger success toast
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                addToast({
                  tone: 'danger',
                  title: 'Probe timed out',
                  description: 'Host 192.168.1.44 did not answer ICMP requests.',
                  action: {
                    label: 'Retry',
                    onClick: () => addToast({ tone: 'info', title: 'Retrying probe…' }),
                  },
                })
              }
            >
              Trigger persistent error toast
            </Button>
            <Tooltip content="Tooltips appear after 400ms and dismiss on Escape." side="top">
              <Button variant="ghost" leftIcon={<Info className="w-4 h-4" />}>
                Hover or focus for tooltip
              </Button>
            </Tooltip>
          </div>
        </Card>
      )}

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => {
          setModalOpen(false);
          addToast({ tone: 'warn', title: 'Policy change confirmed' });
        }}
        tone="danger"
        title="Confirm policy change?"
        description="Disabling this guardrail permits unapproved probes and writes an entry to the audit log."
        confirmLabel="Confirm action"
        cancelLabel="Cancel"
      />

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Endpoint details"
        description="Inspect interface attributes and recent test telemetry."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => {
                setDrawerOpen(false);
                addToast({ tone: 'ok', title: 'Probe completed · 1.2 ms' });
              }}
            >
              Ping now
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-control)] bg-[var(--surface-2)] space-y-2">
            <div className="text-[12px] text-[var(--text-muted)]">Target address</div>
            <div className="flex items-center justify-between gap-2">
              <span className="np-mono-val text-[var(--text)]">192.168.1.1</span>
              <CopyButton value="192.168.1.1" compact />
            </div>
          </div>
          <div className="p-4 rounded-[var(--radius-control)] bg-[var(--surface-2)] space-y-2">
            <div className="text-[12px] text-[var(--text-muted)]">Health status</div>
            <StatusChip size="sm" tone="ok" label="Healthy · 1.4 ms RTT" />
          </div>
        </div>
      </SideDrawer>
    </div>
  );
};
