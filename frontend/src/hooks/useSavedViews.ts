import { useState, useCallback } from 'react';

export interface SavedView<TState> {
  id: string;
  name: string;
  state: TState;
  createdAt: string;
}

/**
 * Persists named filter/search/grouping presets per list view in localStorage.
 */
export function useSavedViews<TState>(storageKey: string) {
  const fullKey = `netpulse_saved_views_${storageKey}`;

  const [views, setViews] = useState<SavedView<TState>[]>(() => {
    try {
      const raw = window.localStorage.getItem(fullKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback(
    (next: SavedView<TState>[]) => {
      setViews(next);
      try {
        window.localStorage.setItem(fullKey, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
    },
    [fullKey]
  );

  const saveView = useCallback(
    (name: string, state: TState): SavedView<TState> => {
      const entry: SavedView<TState> = {
        id: `view-${Date.now()}`,
        name: name.trim(),
        state,
        createdAt: new Date().toISOString(),
      };
      persist([entry, ...views.filter((v) => v.name.toLowerCase() !== entry.name.toLowerCase())]);
      return entry;
    },
    [persist, views]
  );

  const deleteView = useCallback(
    (id: string) => {
      persist(views.filter((v) => v.id !== id));
    },
    [persist, views]
  );

  return { views, saveView, deleteView };
}
