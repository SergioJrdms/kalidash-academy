/**
 * Testes das regras que decidem o que é gratuito e o que é pago.
 *
 * Rodam sem banco e sem rede: `npm test`.
 * Os fluxos que dependem de Supabase/Mux estão no checklist do README.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { canConsume, effectiveAccess, sortByTrail } from '../src/lib/access.ts'
import {
  courseMeta,
  fileExtension,
  formatDuration,
  initials,
  slugify,
} from '../src/lib/format.ts'

// ---------------------------------------------------------------------
// acesso efetivo da aula
// ---------------------------------------------------------------------
test('aula "free" é gratuita mesmo em curso pago', () => {
  assert.equal(effectiveAccess('free', 'paid'), 'free')
})

test('aula "paid" é paga mesmo em curso gratuito', () => {
  // É o caso de "IA para Líderes": curso gratuito, módulos 2 e 3 pagos.
  assert.equal(effectiveAccess('paid', 'free'), 'paid')
})

test('aula "inherit" segue o acesso do curso', () => {
  assert.equal(effectiveAccess('inherit', 'free'), 'free')
  assert.equal(effectiveAccess('inherit', 'paid'), 'paid')
})

// ---------------------------------------------------------------------
// quem pode consumir
// ---------------------------------------------------------------------
test('usuário free consome aula gratuita', () => {
  assert.equal(canConsume('free', false), true)
})

test('usuário free NÃO consome aula paga', () => {
  assert.equal(canConsume('paid', false), false)
})

test('usuário paid consome os dois', () => {
  assert.equal(canConsume('free', true), true)
  assert.equal(canConsume('paid', true), true)
})

// ---------------------------------------------------------------------
// ordem da trilha: módulo primeiro, aula depois
// ---------------------------------------------------------------------
test('ordena por módulo e depois por aula', () => {
  const moduleOrder = new Map([
    ['m1', 0],
    ['m2', 1],
  ])
  const lessons = [
    { id: 'b', module_id: 'm2', sort_order: 1 },
    { id: 'a2', module_id: 'm1', sort_order: 2 },
    { id: 'a1', module_id: 'm1', sort_order: 1 },
  ]
  assert.deepEqual(
    sortByTrail(lessons, moduleOrder).map((l) => l.id),
    ['a1', 'a2', 'b'],
  )
})

// ---------------------------------------------------------------------
// formatação usada na vitrine
// ---------------------------------------------------------------------
test('duração em minutos e horas', () => {
  assert.equal(formatDuration(720), '12 min')
  assert.equal(formatDuration(4500), '1h 15min')
  assert.equal(formatDuration(3600), '1h')
  assert.equal(formatDuration(null), '')
})

test('meta do curso', () => {
  assert.equal(courseMeta(3, 6, 4500), '3 módulos · 6 aulas · 1h 15min')
  assert.equal(courseMeta(1, 1, 720), 'Aula única · 12 min')
  assert.equal(courseMeta(0, 0, 0), 'Em breve')
})

test('iniciais do professor', () => {
  assert.equal(initials('Time Kalidash'), 'TK')
  assert.equal(initials('César Germano'), 'CG')
  assert.equal(initials(null), 'K')
})

test('slug remove acentos', () => {
  assert.equal(slugify('IA aplicada ao Financeiro'), 'ia-aplicada-ao-financeiro')
  assert.equal(slugify('Gestão & Operações'), 'gestao-operacoes')
})

test('extensão do material', () => {
  assert.equal(fileExtension('matriz.pdf'), 'PDF')
  assert.equal(fileExtension('planilha.xlsx'), 'XLSX')
  assert.equal(fileExtension('semextensao'), 'ARQ')
})
