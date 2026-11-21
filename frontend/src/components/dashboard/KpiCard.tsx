import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon?: LucideIcon;
  status?: 'nominal' | 'warning' | 'critical' | 'neutral';
  trend?: {
    direction: 'up' | 'down' | 'flat';
    value: string;
  };
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  subtext,
  icon: Icon,
  status = 'neutral',
  trend,
}) => {
  const statusColors = {
    nominal: {
      border: 'border-[#00D69A]/30',
      text: 'text-[#00D69A]',
      bg: 'bg-[#00D69A]/10',
      glow: 'shadow-green-500/10',
    },
    warning: {
      border: 'border-[#F5B82E]/30',
      text: 'text-[#F5B82E]',
      bg: 'bg-[#F5B82E]/10',
      glow: 'shadow-amber-500/10',
    },
    critical: {
      border: 'border-[#FF475F]/30',
      text: 'text-[#FF475F]',
      bg: 'bg-[#FF475F]/10',
      glow: 'shadow-red-500/10',
    },
    neutral: {
      border: 'border-[#203750]',
      text: 'text-[#22D3EE]',
      bg: 'bg-[#111E30]',
      glow: '',
    },
  }[status];

  return (
    <div
      className={`p-4 rounded-xl bg-[#13243A] border ${statusColors.border} shadow-sm ${statusColors.glow} flex flex-col justify-between transition-all hover:border-[#287EFF]/50`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#91A7C0] tracking-wider uppercase font-mono">
          {label}
        </span>
        {Icon && (
          <div className={`p-1.5 rounded-lg ${statusColors.bg} ${statusColors.text}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="my-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight font-mono text-[#EAF3FF]">
          {value}
        </span>
        {unit && <span className="text-xs text-[#91A7C0] font-mono">{unit}</span>}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#647C96]">
        <span>{subtext || 'Live measurement'}</span>
        {trend && (
          <span
            className={`font-mono font-medium ${
              trend.direction === 'up'
                ? 'text-[#00D69A]'
                : trend.direction === 'down'
                ? 'text-[#FF475F]'
                : 'text-[#91A7C0]'
            }`}
          >
            {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '—'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};
