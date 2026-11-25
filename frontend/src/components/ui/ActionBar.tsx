import React from 'react';
import { Check, Loader2, AlertCircle, RotateCcw } from 'lucide-react';

interface ActionBarProps {
  visible: boolean;
  dirtyCount: number;
  invalid: boolean;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage?: string | null;
  onReset: () => void;
  onSave: () => void;
  sidebarCollapsed?: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  visible,
  dirtyCount,
  invalid,
  saveState,
  errorMessage,
  onReset,
  onSave,
  sidebarCollapsed = false,
}) => {
  const showBar = visible || saveState === 'saving' || saveState === 'saved' || saveState === 'error';

  return (
    <div
      role="region"
      aria-label="Unsaved settings actions"
      aria-live="polite"
      className={`fixed bottom-0 left-0 right-0 z-30 pointer-events-none transition-all duration-[var(--dur-panel)] ease-[var(--ease-out)] ${
        sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-[264px]'
      } ${showBar ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
    >
      <div className="max-w-[1200px] mx-auto px-4 pb-4 sm:px-6 lg:px-8">
        <div className="pointer-events-auto np-popover rounded-[var(--radius-card)] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {saveState === 'error' ? (
              <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--danger)]">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{errorMessage || 'Failed to save settings.'}</span>
              </span>
            ) : saveState === 'saved' ? (
              <span className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--ok)]">
                <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Settings applied</span>
              </span>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--warn)] shrink-0" aria-hidden="true" />
                <span className="text-[13px] font-medium text-[var(--text)]">
                  You have unsaved changes
                </span>
                <span className="px-2 py-1 rounded-[var(--radius-pill)] bg-[var(--surface-2)] text-[12px] leading-4 font-mono text-[var(--text-secondary)]">
                  {dirtyCount} {dirtyCount === 1 ? 'change' : 'changes'}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onReset}
              disabled={saveState === 'saving' || saveState === 'saved'}
              className="h-10 px-4 rounded-[var(--radius-control)] inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Discard</span>
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={invalid || saveState === 'saving' || saveState === 'saved'}
              className={`h-10 min-w-[144px] px-4 rounded-[var(--radius-control)] inline-flex items-center justify-center gap-2 text-[13px] font-semibold transition-all duration-[var(--dur-micro)] ${
                saveState === 'saved'
                  ? 'bg-[var(--ok)] text-[var(--accent-ink)]'
                  : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {saveState === 'saving' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Saving…</span>
                </>
              ) : saveState === 'saved' ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>Saved</span>
                </>
              ) : saveState === 'error' ? (
                <span>Retry save</span>
              ) : (
                <>
                  <span>Save changes</span>
                  <kbd className="hidden sm:inline-block px-2 py-1 text-[12px] leading-none rounded-[var(--radius-control)] bg-[var(--accent-ink)]/15 text-[var(--accent-ink)] font-mono">
                    ⌘S
                  </kbd>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
