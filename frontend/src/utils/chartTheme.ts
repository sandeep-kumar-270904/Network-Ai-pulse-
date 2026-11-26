import { ThemeMode } from '../components/ui/ThemeToggle';

export interface ChartPalette {
  text: string;
  axisLabel: string;
  axisLine: string;
  splitLine: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipSub: string;
  accent: string;
  ok: string;
  warn: string;
  danger: string;
  info: string;
  outageBand: string;
  outageColor: string;
  outageLabel: string;
  zoomBg: string;
  zoomFill: string;
  zoomBorder: string;
  minimapMask: string;
  seriesColors: string[];
}

export const readCssToken = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
};

/**
 * Resolves live CSS design tokens from globals.css for ECharts and ReactFlow.
 */
export const getChartPalette = (theme: ThemeMode = 'dark'): ChartPalette => {
  const isLight = theme === 'light';
  const text = readCssToken('--text', isLight ? '#0f172a' : '#edf2fb');
  const textMuted = readCssToken('--text-muted', isLight ? '#526077' : '#8d9bb5');
  const border = readCssToken('--border', isLight ? '#dce3ee' : '#20293d');
  const borderStrong = readCssToken('--border-strong', isLight ? '#c1cce0' : '#303d59');
  const surface1 = readCssToken('--surface-1', isLight ? '#ffffff' : '#10151f');
  const surface2 = readCssToken('--surface-2', isLight ? '#edf1f7' : '#171e2c');
  const accent = readCssToken('--accent', isLight ? '#155e75' : '#22d3ee');
  const ok = readCssToken('--ok', isLight ? '#065f46' : '#34d399');
  const warn = readCssToken('--warn', isLight ? '#92400e' : '#fbbf24');
  const danger = readCssToken('--danger', isLight ? '#b91c1c' : '#f87171');
  const info = readCssToken('--info', isLight ? '#1d4ed8' : '#60a5fa');
  const dangerSoft = readCssToken(
    '--danger-soft',
    isLight ? 'rgba(185, 28, 28, 0.12)' : 'rgba(248, 113, 113, 0.16)'
  );
  const accentSoft = readCssToken(
    '--accent-soft',
    isLight ? 'rgba(21, 94, 117, 0.14)' : 'rgba(34, 211, 238, 0.14)'
  );

  return {
    text,
    axisLabel: textMuted,
    axisLine: borderStrong,
    splitLine: border,
    tooltipBg: surface1,
    tooltipBorder: borderStrong,
    tooltipText: text,
    tooltipSub: textMuted,
    accent,
    ok,
    warn,
    danger,
    info,
    outageBand: dangerSoft,
    outageColor: danger,
    outageLabel: danger,
    zoomBg: surface2,
    zoomFill: accentSoft,
    zoomBorder: borderStrong,
    minimapMask: readCssToken(
      '--surface-backdrop',
      isLight ? 'rgba(246, 248, 251, 0.72)' : 'rgba(9, 12, 18, 0.72)'
    ),
    seriesColors: [accent, info, ok, warn, danger],
  };
};
