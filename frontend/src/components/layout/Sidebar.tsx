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
  ShieldCheck,
  Radio,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  backendOnline: boolean;
  version?: string;
}

export const NAV_ITEMS = [
  { path: '/', label: 'NOC Overview', icon: LayoutDashboard },
  { path: '/diagnostics', label: 'Network Diagnostics', icon: Activity, badge: 'Live' },
  { path: '/topology', label: 'Network Topology', icon: Network },
  { path: '/inventory', label: 'Infrastructure Inventory', icon: Server },
  { path: '/performance', label: 'Performance Testing', icon: Zap, badge: 'Day 3' },
  { path: '/automation', label: 'Test Automation', icon: Bot, badge: 'Day 5' },
  { path: '/ai-analysis', label: 'AI Analysis', icon: BrainCircuit, badge: 'Day 6' },
  { path: '/alerts', label: 'Alerts & Events', icon: Bell },
  { path: '/history', label: 'Test History', icon: History },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/system', label: 'System Information', icon: Cpu },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  backendOnline,
  version = 'v1.0.0-day1',
}) => {
  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-30 flex flex-col bg-[#091525] border-r border-[#203750] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#203750] bg-[#091525]">
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

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
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
                    <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-[#111E30] text-[#647C96] border border-[#203750] uppercase tracking-wider font-mono">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Backend Status Footer */}
      <div className="p-3 border-t border-[#203750] bg-[#070D18]">
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
