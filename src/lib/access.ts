/**
 * Regras de acesso free/paid — puras, sem dependência de rede.
 *
 * Este arquivo é o espelho no cliente da regra que vale de verdade, que
 * está no servidor (RLS + Edge Functions). Ele existe para a UI saber o
 * que mostrar como bloqueado; ele NÃO é a fronteira de segurança.
 */

export type Access = 'free' | 'paid'
export type LessonAccessType = 'inherit' | 'free' | 'paid'

/** Acesso efetivo de uma aula: 'inherit' cai no acesso do curso. */
export function effectiveAccess(
  lessonAccess: LessonAccessType,
  courseAccess: Access,
): Access {
  if (lessonAccess === 'free') return 'free'
  if (lessonAccess === 'paid') return 'paid'
  return courseAccess
}

/** O usuário pode consumir uma aula com este acesso efetivo? */
export function canConsume(effective: Access, isPaid: boolean): boolean {
  return effective === 'free' || isPaid
}

/** Ordena aulas pela ordem real da trilha: módulo, depois aula. */
export function sortByTrail<
  T extends { module_id: string; sort_order: number },
>(lessons: T[], moduleOrder: Map<string, number>): T[] {
  return lessons.slice().sort((a, z) => {
    const ma = moduleOrder.get(a.module_id) ?? 0
    const mz = moduleOrder.get(z.module_id) ?? 0
    return ma !== mz ? ma - mz : a.sort_order - z.sort_order
  })
}
