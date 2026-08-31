export type Theme = 'dark' | 'light'

const KEY = 'kalidash-theme'

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* private mode / storage bloqueado */
  }
  return 'dark'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-k', theme)
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignora */
  }
}
