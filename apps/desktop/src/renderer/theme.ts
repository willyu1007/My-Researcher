export type ThemeMode = 'system' | 'light' | 'dark';

export type ResolvedTheme = 'morethan.light' | 'morethan.dark';

export const THEME_MODE_STORAGE_KEY = 'desktop.theme.mode';
export const SYSTEM_DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const validThemeModes: ThemeMode[] = ['system', 'light', 'dark'];

function isThemeMode(value: string): value is ThemeMode {
  return (validThemeModes as string[]).includes(value);
}

export function readStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }

  try {
    const storedValue = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (storedValue && isThemeMode(storedValue)) {
      return storedValue;
    }
  } catch {
    // Ignore storage read errors and fallback to system mode.
  }

  return 'system';
}

export function readSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches;
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === 'dark') {
    return 'morethan.dark';
  }

  if (mode === 'system' && prefersDark) {
    return 'morethan.dark';
  }

  return 'morethan.light';
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme === 'morethan.dark' ? 'dark' : 'light';
}
