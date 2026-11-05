/**
 * Legacy-compatible theme resolution:
 * - light: no data-theme attribute
 * - dark: data-theme="dark"
 * - system: follow (prefers-color-scheme: dark), including future changes
 */
export const THEME_CYCLE = Object.freeze(['light', 'dark', 'system']);

export function getNextTheme(currentTheme) {
  const index = THEME_CYCLE.indexOf(currentTheme);
  return THEME_CYCLE[(index + 1) % THEME_CYCLE.length];
}

export function resolveTheme(theme, systemDark) {
  return theme === 'dark' || (theme === 'system' && systemDark) ? 'dark' : 'light';
}

export function applyTheme(root, theme, systemDark) {
  if (resolveTheme(theme, systemDark) === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}
