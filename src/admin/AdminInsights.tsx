import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Banner, ErrorState, Kicker, Skeleton } from '../components/ui'

type CourseEngagement = {
  curso: string
  status: string
  acesso: string
  aulas: number
  alunos_iniciaram: number
  aulas_concluidas: number
  aplicacoes: number
  minutos_assistidos: number
}

type InterestSignal = {
  curso: string
  status: string
  visualizacoes: number
  pessoas: number
  cliques_desbloquear: number
}

type LessonFunnel = {
  curso: string
  modulo: string
  aula: string
  ordem: number
  iniciaram: number
  concluiram: number
  aplicaram: number
}

type EventVolume = {
  evento: string
  total: number
  pessoas: number
  ultimo: string
}

const POSTHOG_CONFIGURED = Boolean(import.meta.env.VITE_POSTHOG_KEY)

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <section style={{ marginBottom: 40 }}>
      <Kicker style={{ marginBottom: 6 }}>{title}</Kicker>
      <div style={{ fontSize: 12.5, color: 'var(--tx3)', marginBottom: 16, maxWidth: 620 }}>
        {hint}
      </div>
      {children}
    </section>
  )
}

function Table({
  head,
  rows,
  empty,
}: {
  head: string[]
  rows: (string | number)[][]
  empty: string
}) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          border: '1px dashed var(--line2)',
          borderRadius: 16,
          padding: 24,
          fontSize: 13,
          color: 'var(--tx3)',
        }}
      >
        {empty}
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--sf2)' }}>
            {head.map((h, i) => (
              <th
                key={h}
                style={{
                  textAlign: i === 0 ? 'left' : 'right',
                  padding: '11px 14px',
                  fontSize: 10.5,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: 'var(--tx3)',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} style={{ borderTop: '1px solid var(--line)' }}>
              {r.map((c, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: '11px 14px',
                    textAlign: ci === 0 ? 'left' : 'right',
                    color: ci === 0 ? 'var(--tx)' : 'var(--tx2)',
                    fontWeight: ci === 0 ? 600 : 400,
                    whiteSpace: ci === 0 ? 'normal' : 'nowrap',
                  }}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminInsights() {
  const [engagement, setEngagement] = useState<CourseEngagement[]>([])
  const [interest, setInterest] = useState<InterestSignal[]>([])
  const [funnel, setFunnel] = useState<LessonFunnel[]>([])
  const [volume, setVolume] = useState<EventVolume[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [a, b, c, d] = await Promise.all([
        supabase.rpc('admin_course_engagement'),
        supabase.rpc('admin_interest_signals'),
        supabase.rpc('admin_lesson_funnel'),
        supabase.rpc('admin_event_volume'),
      ])
      const first = [a, b, c, d].find((r) => r.error)
      if (first?.error) throw new Error(first.error.message)

      setEngagement((a.data ?? []) as CourseEngagement[])
      setInterest((b.data ?? []) as InterestSignal[])
      setFunnel((c.data ?? []) as LessonFunnel[])
      setVolume((d.data ?? []) as EventVolume[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar os dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton height={30} width="30%" />
        <Skeleton height={160} radius={16} />
        <Skeleton height={160} radius={16} />
      </div>
    )
  }

  if (error) return <ErrorState message={error} onRetry={() => void load()} />

  return (
    <div>
      <h1
        style={{
          fontFamily: 'Raleway,sans-serif',
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: '-.02em',
          margin: '0 0 8px',
        }}
      >
        Insights
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 14, margin: '0 0 32px', maxWidth: 640 }}>
        Estes números vêm do seu próprio banco — são exatos e não dependem de
        bloqueador de anúncios. Para clique a clique, mapa de calor e replay de
        sessão, use o PostHog.
      </p>

      {!POSTHOG_CONFIGURED && (
        <div style={{ marginBottom: 32 }}>
          <Banner kind="info">
            PostHog ainda não configurado: falta <code>VITE_POSTHOG_KEY</code>. Os números
            abaixo continuam funcionando — eles não dependem dele.
          </Banner>
        </div>
      )}

      <Section
        title="Interesse por conteúdo"
        hint="Quem abriu a página de cada curso e quem clicou em Desbloquear. É o sinal que responde qual 'em breve' vale produzir primeiro."
      >
        <Table
          head={['Curso', 'Status', 'Aberturas', 'Pessoas', 'Cliques em desbloquear']}
          rows={interest.map((r) => [
            r.curso,
            r.status === 'coming_soon' ? 'Em breve' : r.status === 'published' ? 'Publicado' : 'Rascunho',
            r.visualizacoes,
            r.pessoas,
            r.cliques_desbloquear,
          ])}
          empty="Ainda sem eventos. Eles aparecem conforme as pessoas navegam."
        />
      </Section>

      <Section
        title="Engajamento por curso"
        hint="Vem de lesson_progress: quantas pessoas começaram, quantas aulas foram concluídas e quantas aplicações foram marcadas. Aplicação é o sinal mais forte — significa que a pessoa levou o conteúdo para o trabalho."
      >
        <Table
          head={['Curso', 'Aulas', 'Alunos', 'Concluídas', 'Aplicações', 'Minutos']}
          rows={engagement.map((r) => [
            r.curso,
            r.aulas,
            r.alunos_iniciaram,
            r.aulas_concluidas,
            r.aplicacoes,
            r.minutos_assistidos,
          ])}
          empty="Ainda sem progresso registrado."
        />
      </Section>

      <Section
        title="Onde a trilha perde gente"
        hint="Aula a aula, na ordem real do curso. A queda entre uma linha e a seguinte mostra onde o conteúdo trava."
      >
        <Table
          head={['Aula', 'Curso · Módulo', 'Iniciaram', 'Concluíram', 'Aplicaram']}
          rows={funnel.map((r) => [
            `${String(r.ordem).padStart(2, '0')} · ${r.aula}`,
            `${r.curso} · ${r.modulo}`,
            r.iniciaram,
            r.concluiram,
            r.aplicaram,
          ])}
          empty="Ainda sem aulas com progresso."
        />
      </Section>

      <Section
        title="Volume de eventos · últimos 30 dias"
        hint="Serve para conferir se o rastreamento está vivo. Se um evento parou de aparecer, algo quebrou."
      >
        <Table
          head={['Evento', 'Total', 'Pessoas', 'Último']}
          rows={volume.map((r) => [
            r.evento,
            r.total,
            r.pessoas,
            new Date(r.ultimo).toLocaleString('pt-BR'),
          ])}
          empty="Nenhum evento nos últimos 30 dias."
        />
      </Section>
    </div>
  )
}
