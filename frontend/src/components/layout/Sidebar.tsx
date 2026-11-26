import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  Palette,
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
import { GlobalHealthLevel } from '../../types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenPalette: () => void;
  backendOnline: boolean;
  globalHealth?: GlobalHealthLevel;
  globalHealthReason?: string;
  version?: string;
}

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  badge?: 'LIVE' | 'BETA' | 'NEW';
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
      { path: '/performance', label: 'Synthetic Tests', icon: Zap },
      { path: '/automation', label: 'Automation', icon: Bot },
      { path: '/history', label: 'Test History', icon: History },
    ],
  },
  {
    id: 'intelligence',
    title: 'Intelligence',
    items: [
      { path: '/ai-analysis', label: 'Anomaly Detection', icon: BrainCircuit },
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
      { path: '/design-system', label: 'UI Components', icon: Palette },
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
  globalHealth = 'healthy',
  globalHealthReason = 'All recent probes passed.',
  version = 'v1.0.0',
}) => {
  const location = useLocation();

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
      // Ignore storage errors
    }
  }, [collapsedGroups]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderBody = (isMobileDrawer: boolean) => {
    const isIconRail = collapsed && !isMobileDrawer;

    return (
      <div className="flex flex-col h-full bg-[var(--surface-1)] border-r border-[var(--border)]">
        {/* Brand Block */}
        <div
          className={`h-16 flex items-center border-b border-[var(--border)] shrink-0 ${
            isIconRail ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          {!isIconRail ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--accent-soft)] flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4 text-[var(--accent)]" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-[16px] leading-5 font-semibold text-[var(--text)] tracking-tight truncate">
                  NetPulse AI
                </div>
                <div className="text-[12px] leading-4 text-[var(--text-muted)] truncate">
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
                className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] hover:bg-[var(--surface-3)] transition-colors"
              >
                <PanelLeftOpen className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </Tooltip>
          )}

          {!isIconRail && !isMobileDrawer && (
            <Tooltip
              content={
                <span className="inline-flex items-center gap-2">
                  <span>Collapse sidebar</span>
                  <kbd className="px-2 py-0.5 rounded-[var(--radius-control)] bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[12px]">
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
                className="w-10 h-10 -mr-1 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
              >
                <PanelLeftClose className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </Tooltip>
          )}

          {isMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="w-10 h-10 rounded-[var(--radius-control)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Command Palette Quick Search */}
        <div className="px-3 pt-2 pb-1 shrink-0">
          {isIconRail ? (
            <Tooltip content="Search or jump to… (⌘K)" side="right">
              <button
                type="button"
                onClick={onOpenPalette}
                aria-label="Search or jump to page"
                className="w-full h-10 rounded-[var(--radius-control)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                <Search className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={onOpenPalette}
              className="w-full h-10 px-3 rounded-[var(--radius-control)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] flex items-center justify-between gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="truncate">Search or jump to…</span>
              </span>
              <kbd className="px-2 py-0.5 text-[12px] leading-4 rounded-[var(--radius-control)] bg-[var(--surface-1)] border border-[var(--border)] font-mono text-[var(--text-muted)] shrink-0">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* Scrollable Navigation Sections */}
        <nav
          aria-label="Primary navigation"
          className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
        >
          {NAV_SECTIONS.map((section) => {
            const sectionActive = section.items.some((i) =>
              i.path === '/' ? location.pathname === '/' : location.pathname.startsWith(i.path)
            );
            const groupCollapsed = Boolean(collapsedGroups[section.id]) && !isIconRail;

            return (
              <div key={section.id} className="space-y-0.5">
                {!isIconRail && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(section.id)}
                    aria-expanded={!groupCollapsed}
                    className="w-full h-10 flex items-center justify-between px-3 rounded-[var(--radius-control)] text-left group hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <span
                      className={`text-[12px] leading-4 font-semibold transition-colors ${
                        sectionActive
                          ? 'text-[var(--text)]'
                          : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {section.title}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-[var(--dur-micro)] ${
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
                                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && !isIconRail && (
                                <span
                                  aria-hidden="true"
                                  className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[var(--accent)]"
                                />
                              )}
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                                }`}
                                strokeWidth={1.75}
                                aria-hidden="true"
                              />
                              {!isIconRail && (
                                <span className="flex-1 flex items-center justify-between gap-2 min-w-0">
                                  <span className="whitespace-nowrap truncate">{item.label}</span>
                                  {item.badge && (
                                    <StatusChip
                                      size="xs"
                                      tone="ok"
                                      label={item.badge}
                                      pulseWhenLiveOrDegraded
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
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-1)] shrink-0">
          {!isIconRail ? (
            <Tooltip content={globalHealthReason} side="right">
              <div className="flex items-center justify-between gap-2 text-[12px] leading-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      !backendOnline || globalHealth === 'critical'
                        ? 'bg-[var(--danger)] np-pulse-soft'
                        : globalHealth === 'degraded'
                        ? 'bg-[var(--warn)] np-pulse-soft'
                        : 'bg-[var(--ok)]'
                    }`}
                  />
                  <span className="font-medium text-[var(--text-secondary)] truncate">
                    {!backendOnline
                      ? 'Core offline'
                      : globalHealth === 'critical'
                      ? 'Critical'
                      : globalHealth === 'degraded'
                      ? 'Degraded'
                      : 'Healthy'}
                  </span>
                </div>
                <span className="font-mono text-[12px] text-[var(--text-muted)] shrink-0">
                  {version}
                </span>
              </div>
            </Tooltip>
          ) : (
            <div className="flex justify-center">
              <Tooltip
                content={
                  !backendOnline
                    ? 'Core offline'
                    : `${globalHealth === 'critical' ? 'Critical' : globalHealth === 'degraded' ? 'Degraded' : 'Healthy'} · ${version} — ${globalHealthReason}`
                }
                side="right"
              >
                <span
                  aria-label={!backendOnline ? 'Core offline' : globalHealth}
                  className={`w-2 h-2 rounded-full ${
                    !backendOnline || globalHealth === 'critical'
                      ? 'bg-[var(--danger)] np-pulse-soft'
                      : globalHealth === 'degraded'
                      ? 'bg-[var(--warn)] np-pulse-soft'
                      : 'bg-[var(--ok)]'
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
      <aside
        aria-label="Sidebar"
        className={`hidden lg:block fixed top-0 left-0 h-screen z-30 transition-[width] duration-[var(--dur-layout)] ease-[var(--ease-out)] ${
          collapsed ? 'w-[72px]' : 'w-[264px]'
        }`}
      >
        {renderBody(false)}
      </aside>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex bg-[var(--surface-backdrop)] backdrop-blur-sm"
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
