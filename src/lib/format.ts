const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

/** 720 -> "12 min". Igual ao protótipo: minutos inteiros, horas quando passa de 60. */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return ''
  const total = Math.round(seconds / 60)
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

/** Soma de durações de um curso: "1h 15min" */
export function formatTotalDuration(list: Array<number | null | undefined>): string {
  const total = list.reduce<number>((acc, s) => acc + (s ?? 0), 0)
  return formatDuration(total)
}

/** 432 -> "07:12" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function eventDay(iso: string): { dd: string; mm: string } {
  const d = new Date(iso)
  return {
    dd: String(d.getDate()).padStart(2, '0'),
    mm: MONTHS[d.getMonth()],
  }
}

export function eventTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function eventFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/** "Time Kalidash" -> "TK"; "César Germano" -> "CG" */
export function initials(name: string | null | undefined): string {
  if (!name) return 'K'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'K'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function firstName(name: string | null | undefined): string {
  if (!name) return ''
  return name.trim().split(/\s+/)[0] ?? ''
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

/** "planilha.xlsx" -> "XLSX" */
export function fileExtension(fileName: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(fileName)
  return m ? m[1].toUpperCase().slice(0, 4) : 'ARQ'
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** "3 módulos · 6 aulas · 1h 15min" — como no protótipo. */
export function courseMeta(
  moduleCount: number,
  lessonCount: number,
  totalSeconds: number,
): string {
  if (lessonCount === 0) return 'Em breve'
  const parts: string[] = []
  if (moduleCount > 1) parts.push(`${moduleCount} módulos`)
  parts.push(lessonCount === 1 ? 'Aula única' : `${lessonCount} aulas`)
  const dur = formatDuration(totalSeconds)
  if (dur) parts.push(dur)
  return parts.join(' · ')
}
