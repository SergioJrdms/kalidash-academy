/** Paths SVG por área — os mesmos do protótipo. */
export const AREA_ICON: Record<string, string> = {
  'Gestão': 'M4 20V9M10 20V4M16 20v-7M22 20H2',
  'Financeiro': 'M4 18h16M6 14l4-5 3.5 3L19 6',
  'RH': 'M9 11a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5M17 5.2a2.9 2.9 0 010 5.6M19.5 20c0-2.3-.6-4-2-5',
  'Marketing': 'M3 8h18M3 8v11h18V8M3 8l3-4h12l3 4M9 13h6',
  'Comercial': 'M3 5h18v4H3zM5 9v10h14V9M9 13h6',
  'Operações':
    'M4 6h9M4 12h16M11 18h9M6 12a2 2 0 104 0 2 2 0 10-4 0M14 6a2 2 0 104 0 2 2 0 10-4 0M4 18a2 2 0 104 0 2 2 0 10-4 0',
}

export function areaIcon(area: string | null | undefined): string {
  return (area && AREA_ICON[area]) || AREA_ICON['Gestão']
}

export const NAV_ICON = {
  home: 'M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  conteudos: 'M12 3 3 8l9 5 9-5-9-5M3 13l9 5 9-5',
  eventos: 'M3 6h18v15H3zM8 3v4M16 3v4M3 11h18',
  perfil: 'M12 11a3.4 3.4 0 100-6.8 3.4 3.4 0 000 6.8M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6',
  play: 'M8 5l11 7-11 7z',
  lock: 'M7 11V8a5 5 0 1110 0v3',
  check: 'M4 12.5l5 5L20 6.5',
  arrow: 'M5 12h13M13 6l6 6-6 6',
  spark:
    'M12 3l1.8 5 5 1.8-5 1.8L12 16.6l-1.8-5-5-1.8 5-1.8zM18.5 16.8l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
} as const
