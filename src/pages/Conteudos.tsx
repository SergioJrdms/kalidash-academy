import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { forYou, type CatalogCourse } from '../services/catalog'
import { areaIcon } from '../lib/icons'
import { courseMeta, initials } from '../lib/format'
import { AREAS } from '../types/db'
import {
  Avatar,
  CourseThumb,
  EmptyState,
  ErrorState,
  PageLoading,
  ProgressBar,
  Tag,
  type TagKind,
} from '../components/ui'

function tagKind(c: CatalogCourse, isPaid: boolean): TagKind {
  if (c.status === 'coming_soon') return 'soon'
  if (c.access_type === 'free') return 'free'
  return isPaid ? 'unlocked' : 'paid'
}

export default function Conteudos() {
  const { profile, isPaid } = useAuth()
  const { courses, loading, error, reload } = useCatalog()
  const [params, setParams] = useSearchParams()

  const tab = params.get('tab') === 'explorar' ? 'explorar' : 'voce'
  const filter = params.get('area') ?? 'Todos'

  const list = useMemo(() => {
    if (tab === 'voce') return forYou(courses, profile?.area ?? null, isPaid)
    return filter === 'Todos' ? courses : courses.filter((c) => c.area === filter)
  }, [courses, tab, filter, profile?.area, isPaid])

  function setTab(next: 'voce' | 'explorar') {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    if (next === 'voce') p.delete('area')
    setParams(p, { replace: true })
  }

  function setArea(next: string) {
    const p = new URLSearchParams(params)
    p.set('tab', 'explorar')
    if (next === 'Todos') p.delete('area')
    else p.set('area', next)
    setParams(p, { replace: true })
  }

  if (loading) return <PageLoading />

  if (error) {
    return (
      <div className="k-page" style={{ padding: '56px 56px' }}>
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    )
  }

  return (
    <div className="k-page" style={{ padding: '56px 56px 100px', maxWidth: 1060 }}>
      <h1
        className="k-h1"
        style={{
          fontFamily: 'Raleway,sans-serif',
          fontWeight: 700,
          fontSize: 31,
          lineHeight: 1.16,
          letterSpacing: '-.03em',
          margin: '0 0 10px',
        }}
      >
        Conteúdos
      </h1>
      <p style={{ color: 'var(--tx2)', margin: '0 0 34px', fontSize: 15 }}>
        Comece pelo que já está liberado. Conheça o resto quando quiser.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid var(--line)',
          marginBottom: 28,
        }}
      >
        {(
          [
            ['Para você', 'voce'],
            ['Explorar', 'explorar'],
          ] as const
        ).map(([label, key]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${tab === key ? 'var(--p)' : 'transparent'}`,
              color: tab === key ? 'var(--tx)' : 'var(--tx3)',
              padding: '13px 18px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'explorar' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 30 }}>
          {['Todos', ...AREAS].map((name) => {
            const on = filter === name
            return (
              <button
                key={name}
                onClick={() => setArea(name)}
                style={{
                  background: on ? 'var(--psoft)' : 'var(--sf)',
                  border: `1px solid ${on ? 'var(--pline)' : 'var(--line)'}`,
                  color: on ? 'var(--tx)' : 'var(--tx2)',
                  borderRadius: 999,
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all .18s',
                }}
              >
                {name}
              </button>
            )
          })}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          title="Nada nessa área ainda"
          message="Estamos publicando por área. Veja o que já está no ar em Todos."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {list.map((c) => {
            const locked = c.status !== 'coming_soon' && !c.hasFreeLesson && !isPaid
            const owned = c.hasFreeLesson || isPaid
            const cta =
              c.status === 'coming_soon'
                ? 'Ver estrutura'
                : owned
                  ? c.progress > 0
                    ? 'Continuar'
                    : 'Começar'
                  : 'Conhecer'

            return (
              <Link
                key={c.id}
                to={`/conteudos/${c.slug}`}
                className="k-hoverable k-lift k-stack-mobile"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  gap: 24,
                  alignItems: 'center',
                  background: 'var(--sf)',
                  border: `1px solid ${c.progress > 0 ? 'var(--pline)' : 'var(--line)'}`,
                  borderRadius: 20,
                  padding: '22px 24px',
                  color: 'var(--tx)',
                  transition: 'all .2s',
                }}
              >
                <CourseThumb
                  className="k-thumb-mobile"
                  iconPath={areaIcon(c.area)}
                  imageUrl={c.thumbnail_url}
                  width={118}
                  height={82}
                  locked={locked}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      marginBottom: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9.5,
                        letterSpacing: '.15em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: 'var(--tx3)',
                      }}
                    >
                      {c.area}
                    </span>
                    <Tag kind={tagKind(c, isPaid)} />
                  </div>

                  <div
                    style={{
                      fontFamily: 'Raleway,sans-serif',
                      fontWeight: 700,
                      fontSize: 17.5,
                      lineHeight: 1.28,
                      marginBottom: 9,
                    }}
                  >
                    {c.title}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={initials(c.instructor_name)} size={22} fontSize={8.5} />
                    <span style={{ fontSize: 12.5, color: 'var(--tx3)' }}>
                      {c.instructor_name ?? 'Time Kalidash'} ·{' '}
                      {courseMeta(c.moduleCount, c.lessonCount, c.totalSeconds)}
                    </span>
                  </div>

                  {c.progress > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        maxWidth: 280,
                        marginTop: 12,
                      }}
                    >
                      <ProgressBar percent={c.progress} height={4} />
                      <span style={{ flex: 'none', fontSize: 11, color: 'var(--tx3)' }}>
                        {c.progress}%
                      </span>
                    </div>
                  )}
                </div>

                <span
                  style={{
                    flex: 'none',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color:
                      owned && c.status !== 'coming_soon' ? 'var(--p2)' : 'var(--tx2)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cta}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
