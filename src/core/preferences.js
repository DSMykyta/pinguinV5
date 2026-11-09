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
  asidePinned: false,
});

const THEMES = new Set(['system', 'light', 'dark']);

/**
 * Generic, best-effort JSON preference IO shared by Shell and optional features.
 * Callers supply a stable versioned key; absent/private storage does not throw.
 */
export function loadStoredValue(storage, key, fallback = null) {
  try {
    const raw = storage?.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveStoredValue(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * One typed persisted-choice mechanism for table/cards, density, etc.
 * It never writes unrelated feature keys or accepts unlisted choices.
 */
export function createStoredChoice({ storage, key, choices, defaultValue }) {
  if (typeof key !== 'string' || !/^pg:v[0-9]+:[a-z0-9-]+(?::[a-z0-9-]+)+$/.test(key)) {
    throw new TypeError('Stored choice requires a versioned pg key');
  }
  if (!Array.isArray(choices) || choices.length < 1 ||
      choices.some(choice => typeof choice !== 'string') ||
      new Set(choices).size !== choices.length || !choices.includes(defaultValue)) {
    throw new TypeError('Stored choice requires unique allowed values and a valid default');
  }
  const allowed = new Set(choices);
  const saved = loadStoredValue(storage, key, defaultValue);
  let current = allowed.has(saved) ? saved : defaultValue;
  return Object.freeze({
    getValue: () => current,
    setValue(value) {
      if (!allowed.has(value)) throw new RangeError('Unsupported stored choice: ' + value);
      if (value === current) return true;
      current = value;
      return saveStoredValue(storage, key, value);
    },
  });
}


export function normalizePreferences(value) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_PREFERENCES };
  }
  return {
    theme: THEMES.has(value.theme) ? value.theme : DEFAULT_PREFERENCES.theme,
    sidebarCollapsed: typeof value.sidebarCollapsed === 'boolean'
      ? value.sidebarCollapsed : DEFAULT_PREFERENCES.sidebarCollapsed,
    asideOpen: value.asidePinned === true ? true : typeof value.asideOpen === 'boolean'
      ? value.asideOpen : DEFAULT_PREFERENCES.asideOpen,
    asidePinned: value.asidePinned === true,
  };
}

export function loadPreferences(storage) {
  try {
    const preferences = normalizePreferences(loadStoredValue(storage, SHELL_STORAGE_KEY, null));
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
    const saved = saveStoredValue(storage, SHELL_STORAGE_KEY, value);
    storage?.setItem(LEGACY_THEME_KEY, value.theme);
    return saved;
  } catch {
    return false;
  }
}
