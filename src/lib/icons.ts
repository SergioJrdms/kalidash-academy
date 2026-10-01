/** Traços de ícone do design novo — linha fina, 24x24. */
export const NAV_ICON = {
  home: 'M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z',
  explorar: 'M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5z',
  jornada: 'M4 20V10M10 20V4M16 20v-6M22 20H2',
  aplicar: 'M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 3.9M15.4 6.6L8.6 10.5',
  eventos: 'M4 6h16v15H4zM8 3v4M16 3v4M4 11h16',
  comunidade:
    'M9 11a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5M17 5.2a2.9 2.9 0 010 5.6M19.5 20c0-2.3-.6-4-2-5',
  perfil: 'M12 11a3.4 3.4 0 100-6.8 3.4 3.4 0 000 6.8M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6',
  admin: 'M12 3l7 4v10l-7 4-7-4V7z',

  play: 'M8 5l11 7-11 7z',
  check: 'M4 12.5l5 5L20 6.5',
  arrow: 'M5 12h13M13 6l6 6-6 6',
  arrowRight: 'M9 6l6 6-6 6',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  book: 'M4 5a2 2 0 012-2h13v18H6a2 2 0 01-2-2zM19 17H6',
  bookmark: 'M6 4h12v17l-6-4-6 4z',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  spark: 'M12 3l1.8 5 5 1.8-5 1.8L12 16.6l-1.8-5-5-1.8 5-1.8z',
  certificate: 'M12 15a5 5 0 100-10 5 5 0 000 10zM8.5 14L7 22l5-2.5L17 22l-1.5-8',
  level: 'M4 20v-5M10 20V9M16 20V4',
  note: 'M5 3h9l5 5v13H5zM14 3v5h5',
  download: 'M12 4v11M7.5 11L12 15.5 16.5 11M5 20h14',
} as const

/**
 * Ícones por área. O design novo usa um conjunto maior de áreas que o
 * protótipo original; mantemos as antigas para o conteúdo já cadastrado.
 */
export const AREA_ICON: Record<string, string> = {
  'Liderança': NAV_ICON.perfil,
  'Gestão': NAV_ICON.jornada,
  'Operações': 'M4 6h9M4 12h16M11 18h9M6 12a2 2 0 104 0 2 2 0 10-4 0M14 6a2 2 0 104 0 2 2 0 10-4 0M4 18a2 2 0 104 0 2 2 0 10-4 0',
  'Tecnologia': 'M8 6l-5 6 5 6M16 6l5 6-5 6M13 4l-2 16',
  'Financeiro': 'M4 18h16M6 14l4-5 3.5 3L19 6',
  'RH': NAV_ICON.comunidade,
  'Comercial': 'M3 5h18v4H3zM5 9v10h14V9M9 13h6',
  'Marketing': 'M3 8h18M3 8v11h18V8M3 8l3-4h12l3 4M9 13h6',
  'Jurídico': 'M12 3v18M5 7h14M7 7l-3 7h6zM17 7l-3 7h6z',
}

export function areaIcon(area: string | null | undefined): string {
  return (area && AREA_ICON[area]) || NAV_ICON.jornada
}
