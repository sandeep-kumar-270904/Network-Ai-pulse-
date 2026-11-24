import React from 'react';
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
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  backendOnline: boolean;
  version?: string;
}

export interface NavSection {
  title: string;
  items: {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'OBSERVABILITY',
    items: [
      { path: '/', label: 'NOC Overview', icon: LayoutDashboard },
      { path: '/topology', label: 'Network Topology', icon: Network },
      { path: '/inventory', label: 'Infrastructure Inventory', icon: Server },
    ],
  },
  {
    title: 'ACTIVE DIAGNOSTICS & TESTING',
    items: [
      { path: '/diagnostics', label: 'Network Diagnostics', icon: Activity, badge: 'LIVE', badgeColor: 'text-[#00D69A] border-[#00D69A]/40 bg-[#00D69A]/10' },
      { path: '/performance', label: 'Synthetic Performance', icon: Zap, badge: 'L4-L7', badgeColor: 'text-[#F5B82E] border-[#F5B82E]/40 bg-[#F5B82E]/10' },
      { path: '/automation', label: 'Automated Test Suites', icon: Bot, badge: 'CRON', badgeColor: 'text-[#287EFF] border-[#287EFF]/40 bg-[#287EFF]/10' },
      { path: '/history', label: 'Telemetry History', icon: History, badge: 'SQLITE', badgeColor: 'text-[#22D3EE] border-[#22D3EE]/40 bg-[#22D3EE]/10' },
    ],
  },
  {
    title: 'INTELLIGENCE & AUDITING',
    items: [
      { path: '/ai-analysis', label: 'Anomaly Analysis', icon: BrainCircuit, badge: 'ML', badgeColor: 'text-[#22D3EE] border-[#22D3EE]/40 bg-[#22D3EE]/10' },
      { path: '/alerts', label: 'Operational Alerts', icon: Bell },
      { path: '/analytics', label: 'Performance Analytics', icon: BarChart3 },
      { path: '/reports', label: 'Technical Reports', icon: FileText },
    ],
  },
  {
    title: 'SYSTEM & CONFIGURATION',
    items: [
      { path: '/system', label: 'Host & Platform Info', icon: Cpu },
      { path: '/settings', label: 'Platform Settings', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  backendOnline,
  version = 'v2.4.0-NOC',
}) => {
  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 flex flex-col bg-[#091525] border-r border-[#203750] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#203750] bg-[#091525] flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22D3EE] to-[#287EFF] flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/20">
              <Radio className="w-4 h-4 text-[#080E19]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-wider text-[#EAF3FF] uppercase font-mono">
                NetPulse AI
              </span>
              <span className="text-[10px] text-[#22D3EE] tracking-widest uppercase font-semibold">
                Network Intel
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#22D3EE] to-[#287EFF] flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
            <Radio className="w-4 h-4 text-[#080E19]" />
          </div>
        )}

        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="text-[#91A7C0] hover:text-[#EAF3FF] hover:bg-[#13243A] p-1.5 rounded-md transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List grouped by Section */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 custom-scrollbar">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#647C96]">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#13243A] text-[#22D3EE] border border-[#22D3EE]/40 shadow-sm'
                        : 'text-[#91A7C0] hover:text-[#EAF3FF] hover:bg-[#0D192B]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`ml-2 text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase tracking-wider border ${
                            item.badgeColor || 'bg-[#111E30] text-[#647C96] border-[#203750]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Backend Status Footer */}
      <div className="p-3 border-t border-[#203750] bg-[#070D18] flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendOnline ? 'bg-[#00D69A] glow-green' : 'bg-[#FF475F] glow-red'
                }`}
              />
              <span className="text-[11px] font-mono text-[#91A7C0]">
                {backendOnline ? 'CORE ONLINE' : 'DISCONNECTED'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#647C96]">{version}</span>
          </div>
        ) : (
          <div className="flex justify-center" title={backendOnline ? 'Core Online' : 'Disconnected'}>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                backendOnline ? 'bg-[#00D69A] glow-green' : 'bg-[#FF475F] glow-red'
              }`}
            />
          </div>
        )}
      </div>
    </aside>
  );
};
