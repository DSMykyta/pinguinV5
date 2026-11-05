/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║ PINGUIN NEXT — PREFERENCES                                                                         ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║ ПРИЗНАЧЕННЯ: Зберігає тему й стан панелей у localStorage.                                          ║
 * ║ ЗАЛЕЖНОСТІ: Переданий storage.                                                                     ║
 * ║ ПУБЛІЧНИЙ API: loadPreferences(), savePreferences().                                               ║
 * ║ ПРИНЦИП: Відсутність storage не ламає сайт.                                                        ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

export const SHELL_STORAGE_KEY = 'pg:v2:shell:preferences';
export const LEGACY_THEME_KEY = 'theme-mode';

export const DEFAULT_PREFERENCES = Object.freeze({
  theme: 'system',
  sidebarCollapsed: false,
  asideOpen: false,
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
    const preferences = normalizePreferences(stored ? JSON.parse(stored) : null);
    // Respect existing theme preferences from the original Pinguin V5.
    const legacyTheme = storage?.getItem(LEGACY_THEME_KEY);
    if (THEMES.has(legacyTheme)) preferences.theme = legacyTheme;
    return preferences;
  } catch {
    return normalizePreferences(null);
  }
}

export function savePreferences(storage, preferences) {
  const value = normalizePreferences(preferences);
  try {
    storage?.setItem(SHELL_STORAGE_KEY, JSON.stringify(value));
    storage?.setItem(LEGACY_THEME_KEY, value.theme);
    return true;
  } catch {
    return false;
  }
}
