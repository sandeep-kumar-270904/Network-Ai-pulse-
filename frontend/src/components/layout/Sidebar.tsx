import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Network,
  Server,
  Zap,
  Bot,
  BrainCircuit,
  Bell,
  History,
  BarChart3,
  FileText,
  Cpu,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Search,
  Radio,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { StatusChip } from '../ui/StatusChip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenPalette: () => void;
  backendOnline: boolean;
  version?: string;
}

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: 'LIVE' | 'BETA' | 'NEW';
  description?: string;
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'observability',
    title: 'Observability',
    items: [
      { path: '/', label: 'Overview', icon: LayoutDashboard },
      { path: '/topology', label: 'Network Topology', icon: Network },
      { path: '/inventory', label: 'Inventory', icon: Server },
    ],
  },
  {
    id: 'diagnostics',
    title: 'Active Testing',
    items: [
      { path: '/diagnostics', label: 'Diagnostics', icon: Activity, badge: 'LIVE' },
      { path: '/performance', label: 'Synthetic Tests', icon: Zap, description: 'L4–L7 throughput and MTU benchmarks' },
      { path: '/automation', label: 'Automation', icon: Bot, description: 'Scheduled background probes' },
      { path: '/history', label: 'Test History', icon: History, description: 'Local telemetry archive' },
    ],
  },
  {
    id: 'intelligence',
    title: 'Intelligence',
    items: [
      { path: '/ai-analysis', label: 'Anomaly Detection', icon: BrainCircuit, description: 'IsolationForest telemetry scoring' },
      { path: '/alerts', label: 'Alerts & Events', icon: Bell },
      { path: '/analytics', label: 'Analytics', icon: BarChart3 },
      { path: '/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      { path: '/system', label: 'System Info', icon: Cpu },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const STORAGE_GROUPS_KEY = 'netpulse_sidebar_groups';

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
  onOpenPalette,
  backendOnline,
  version = 'v1.0.0',
}) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_GROUPS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_GROUPS_KEY, JSON.stringify(collapsedGroups));
    } catch {
      // Ignore storage quota or private-mode restrictions
    }
  }, [collapsedGroups]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderBody = (isMobileDrawer: boolean) => {
    const isIconRail = collapsed && !isMobileDrawer;

    return (
      <div className="flex flex-col h-full bg-[var(--bg-elev-1)] border-r border-[var(--border)]">
        {/* Brand Block */}
        <div
          className={`h-16 flex items-center border-b border-[var(--border)] shrink-0 ${
            isIconRail ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          {!isIconRail ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--accent-soft)] border border-[var(--accent)]/35 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] leading-5 font-semibold text-[var(--text)] tracking-tight truncate">
                  NetPulse AI
                </div>
                <div className="text-[11px] leading-4 text-[var(--text-muted)] truncate">
                  Network Intelligence
                </div>
              </div>
            </div>
          ) : (
            <Tooltip content="Expand sidebar ([)" side="right">
              <button
                type="button"
                onClick={onToggle}
                aria-label="Expand sidebar"
                className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--accent-soft)] border border-[var(--accent)]/35 flex items-center justify-center text-[var(--accent)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <PanelLeftOpen className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </Tooltip>
          )}

          {!isIconRail && !isMobileDrawer && (
            <Tooltip
              content={
                <span className="inline-flex items-center gap-2">
                  <span>Collapse sidebar</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-elev-2)] border border-[var(--border)] font-mono text-[10px]">
                    [
                  </kbd>
                </span>
              }
              side="right"
            >
              <button
                type="button"
                onClick={onToggle}
                aria-label="Collapse sidebar"
                className="w-8 h-8 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </Tooltip>
          )}

          {isMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="w-10 h-10 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Command Palette Quick Entry */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          {isIconRail ? (
            <Tooltip content="Search or jump to… (⌘K)" side="right">
              <button
                type="button"
                onClick={onOpenPalette}
                aria-label="Search or jump to page"
                className="w-full h-10 rounded-[var(--radius-control)] bg-[var(--bg-elev-2)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                <Search className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={onOpenPalette}
              className="w-full h-10 px-3 rounded-[var(--radius-control)] bg-[var(--bg-elev-2)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] flex items-center justify-between gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span className="truncate">Search or jump to…</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] leading-none rounded bg-[var(--bg-elev-1)] border border-[var(--border)] font-mono text-[var(--text-muted)] shrink-0">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <nav
          aria-label="Primary navigation"
          className="flex-1 overflow-y-auto px-3 pt-2 pb-5 space-y-4"
        >
          {NAV_SECTIONS.map((section) => {
            const groupCollapsed = Boolean(collapsedGroups[section.id]) && !isIconRail;

            return (
              <div key={section.id} className="space-y-1">
                {!isIconRail && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(section.id)}
                    aria-expanded={!groupCollapsed}
                    className="w-full flex items-center justify-between px-3 py-1 rounded text-left group hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <span className="np-eyebrow group-hover:text-[var(--text-secondary)]">
                      {section.title}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-[var(--dur-micro)] ${
                        groupCollapsed ? '-rotate-90' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                )}

                {!groupCollapsed && (
                  <ul className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const linkContent = (
                        <NavLink
                          to={item.path}
                          end={item.path === '/'}
                          onClick={isMobileDrawer ? onCloseMobile : undefined}
                          className={({ isActive }) =>
                            `relative flex items-center h-10 px-3 rounded-[var(--radius-control)] text-[14px] leading-5 font-medium transition-colors duration-[var(--dur-micro)] ease-[var(--ease-out)] ${
                              isIconRail ? 'justify-center px-0' : 'gap-3'
                            } ${
                              isActive
                                ? 'bg-[var(--accent-soft)] text-[var(--text)]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && !isIconRail && (
                                <span
                                  aria-hidden="true"
                                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-[var(--accent)]"
                                />
                              )}
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                                }`}
                                strokeWidth={1.5}
                                aria-hidden="true"
                              />
                              {!isIconRail && (
                                <span className="flex-1 flex items-center justify-between gap-2 min-w-0">
                                  <span className="whitespace-nowrap">{item.label}</span>
                                  {item.badge && (
                                    <StatusChip
                                      size="xs"
                                      tone={item.badge === 'LIVE' ? 'ok' : 'neutral'}
                                      label={item.badge}
                                    />
                                  )}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      );

                      return (
                        <li key={item.path}>
                          {isIconRail ? (
                            <Tooltip content={item.label} side="right">
                              {linkContent}
                            </Tooltip>
                          ) : (
                            linkContent
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg)] shrink-0">
          {!isIconRail ? (
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    backendOnline
                      ? 'bg-[var(--ok)]'
                      : 'bg-[var(--danger)] np-pulse-degraded'
                  }`}
                />
                <span className="font-medium text-[var(--text-secondary)] truncate">
                  {backendOnline ? 'Core online' : 'Core offline'}
                </span>
              </div>
              <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0">
                {version}
              </span>
            </div>
          ) : (
            <div className="flex justify-center">
              <Tooltip content={backendOnline ? `Core online · ${version}` : 'Core offline'} side="right">
                <span
                  aria-label={backendOnline ? 'Core online' : 'Core offline'}
                  className={`w-2.5 h-2.5 rounded-full ${
                    backendOnline
                      ? 'bg-[var(--ok)]'
                      : 'bg-[var(--danger)] np-pulse-degraded'
                  }`}
                />
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside
        aria-label="Sidebar"
        className={`hidden md:block fixed top-0 left-0 h-screen z-30 transition-[width] duration-[var(--dur-layout)] ease-[var(--ease-out)] ${
          collapsed ? 'w-[72px]' : 'w-[264px]'
        }`}
      >
        {renderBody(false)}
      </aside>

      {/* Mobile Overlay Drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex bg-[#070b14]/75 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseMobile();
          }}
        >
          <aside aria-label="Mobile navigation" className="w-[264px] h-full shadow-[var(--shadow-popover)]">
            {renderBody(true)}
          </aside>
        </div>
      )}
    </>
  );
};
