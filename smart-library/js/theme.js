// ============================================================
// THEME.JS — light/dark mode, persisted in localStorage.
// Per the project brief, localStorage is only used here for a
// small UI preference (theme) — all real data stays in Supabase.
// The actual theme is applied earlier, by the inline snippet in
// each page's <head> (see theme-init.js), to avoid a flash of
// the wrong theme before this module loads.
// ============================================================

const STORAGE_KEY = 'sl-theme';

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
}
