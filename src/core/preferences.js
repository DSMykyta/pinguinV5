export const SHELL_STORAGE_KEY = 'pg:v1:shell:preferences';

export const DEFAULT_PREFERENCES = Object.freeze({
  theme: 'system',
  sidebarCollapsed: false,
  asideOpen: true,
});

const THEMES = new Set(['system', 'light', 'dark']);

export function normalizePreferences(value) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_PREFERENCES };
  }

  return {
    theme: THEMES.has(value.theme) ? value.theme : DEFAULT_PREFERENCES.theme,
    sidebarCollapsed: typeof value.sidebarCollapsed === 'boolean'
      ? value.sidebarCollapsed : DEFAULT_PREFERENCES.sidebarCollapsed,
    asideOpen: typeof value.asideOpen === 'boolean'
      ? value.asideOpen : DEFAULT_PREFERENCES.asideOpen,
  };
}

export function loadPreferences(storage) {
  try {
    const stored = storage?.getItem(SHELL_STORAGE_KEY);
    return normalizePreferences(stored ? JSON.parse(stored) : null);
  } catch {
    return normalizePreferences(null);
  }
}

export function savePreferences(storage, preferences) {
  const value = normalizePreferences(preferences);
  try {
    storage?.setItem(SHELL_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
