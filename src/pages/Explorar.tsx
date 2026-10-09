import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { loadBookmarks, loadLabs, toggleBookmark, type LabView } from '../services/jornada'
import { supabase } from '../lib/supabase'
import { NAV_ICON, areaIcon } from '../lib/icons'
import { eventDay, formatDuration, initials } from '../lib/format'
import { AREAS, GOALS, LEVELS, type AcademyEvent, type Skill } from '../types/db'
import type { CatalogCourse } from '../services/catalog'
import {
  CourseThumb,
  EmptyState,
  ErrorState,
  Icon,
  Kicker,
  LockIcon,
  PageLoading,
  ProgressBar,
  SkillChip,
  Tag,
  inputStyle,
} from '../components/ui'
import { track } from '../lib/analytics'
import { Imagem } from '../components/Imagem'

type Aba = 'todos' | 'trilhas' | 'aulas' | 'eventos' | 'labs'

const FORMATOS = ['Vídeo', 'Texto', 'Prático'] as const
const DURACOES = [
  { label: 'Até 1h', max: 3600 },
  { label: '1h a 3h', min: 3600, max: 10800 },
  { label: 'Mais de 3h', min: 10800 },
] as const

/** Dropdown de filtro no estilo do design: pílula com seta. */
function Filtro({
  label,
  valor,
  opcoes,
  onPick,
}: {
  label: string
  valor: string | null
  opcoes: string[]
  onPick: (v: string | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: valor ? 'var(--imperial)' : 'var(--surface)',
          color: valor ? 'var(--bg)' : 'var(--tx)',
          border: `0.8px solid ${valor ? 'var(--imperial)' : 'var(--line2)'}`,
          borderRadius: 99,
          padding: '8px 14px',
          fontSize: 13,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {valor ?? label}
        <Icon d="M6 9l6 6 6-6" size={14} stroke={valor ? 'var(--bg)' : 'var(--tx2)'} />
      </button>

      {open && (
        <div
          className="k-pop"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 30,
            background: 'var(--surface)',
            border: '0.8px solid var(--line)',
            borderRadius: 'var(--r-card)',
            boxShadow: '0 12px 32px rgba(14,10,20,.12)',
            padding: 6,
            minWidth: 190,
          }}
        >
          {valor && (
            <button
              onMouseDown={() => onPick(null)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                padding: '9px 12px',
                fontSize: 13.5,
                color: 'var(--tx2)',
                cursor: 'pointer',
                borderRadius: 8,
              }}
            >
              Limpar
            </button>
          )}
          {opcoes.map((o) => (
            <button
              key={o}
              onMouseDown={() => onPick(o)}
              className="k-row"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                padding: '9px 12px',
                fontSize: 13.5,
                color: o === valor ? 'var(--tx)' : 'var(--tx2)',
                fontWeight: o === valor ? 600 : 400,
                cursor: 'pointer',
                borderRadius: 8,
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Explorar() {
  const { profile, isPaid, session } = useAuth()
  const { courses, loading, error, reload } = useCatalog()
  const [params, setParams] = useSearchParams()
  const userId = session?.user.id ?? null

  const [busca, setBusca] = useState('')
  const [skillsByCourse, setSkillsByCourse] = useState<Map<string, Skill[]>>(new Map())
  const [eventos, setEventos] = useState<AcademyEvent[]>([])
  const [salvos, setSalvos] = useState<Set<string>>(new Set())
  const [labs, setLabs] = useState<LabView[]>([])

  const aba = (params.get('aba') as Aba) ?? 'todos'
  const fArea = params.get('area')
  const fNivel = params.get('nivel')
  const fObjetivo = params.get('objetivo')
  const fFormato = params.get('formato')
  const fDuracao = params.get('duracao')

  useEffect(() => {
    let active = true
    Promise.all([
      supabase.from('course_skills').select('course_id, skill_id'),
      supabase.from('skills').select('*'),
      supabase.from('events').select('*').eq('status', 'published').order('starts_at'),
      userId ? loadBookmarks(userId) : Promise.resolve(new Set<string>()),
      loadLabs(userId).catch(() => [] as LabView[]),
    ]).then(([mapRes, skillsRes, evRes, bm, labList]) => {
      if (!active) return
      const skills = (skillsRes.data ?? []) as Skill[]
      const m = new Map<string, Skill[]>()
      for (const row of (mapRes.data ?? []) as { course_id: string; skill_id: string }[]) {
        const s = skills.find((x) => x.id === row.skill_id)
        if (!s) continue
        m.set(row.course_id, [...(m.get(row.course_id) ?? []), s])
      }
      setSkillsByCourse(m)
      setEventos((evRes.data ?? []) as AcademyEvent[])
      setSalvos(bm)
      setLabs(labList)
    })
    return () => {
      active = false
    }
  }, [userId])

  function setParam(chave: string, valor: string | null) {
    const p = new URLSearchParams(params)
    if (valor) p.set(chave, valor)
    else p.delete(chave)
    setParams(p, { replace: true })
  }

  const filtrados = useMemo(() => {
    let list = courses

    if (aba === 'trilhas') list = list.filter((c) => c.kind === 'trilha')

    if (fArea) list = list.filter((c) => c.area === fArea)
    if (fNivel) list = list.filter((c) => c.level === fNivel || c.level_max === fNivel)

    if (fFormato === 'Vídeo') list = list.filter((c) => c.lessons.some((l) => l.has_video))
    if (fFormato === 'Texto') list = list.filter((c) => c.lessons.some((l) => !l.has_video))

    if (fDuracao) {
      const d = DURACOES.find((x) => x.label === fDuracao)
      if (d) {
        list = list.filter((c) => {
          const t = c.totalSeconds
          if ('min' in d && d.min != null && t < d.min) return false
          if ('max' in d && d.max != null && t > d.max) return false
          return true
        })
      }
    }

    const q = busca.trim().toLowerCase()
    if (q) {
      list = list.filter((c) =>
        [c.title, c.short_description, c.description, c.area, c.instructor_name]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q)),
      )
    }

    return list
  }, [courses, aba, fArea, fNivel, fFormato, fDuracao, busca])

  /**
   * A aba "Aulas" lista aula por aula, não curso por curso: é o atalho
   * para quem busca um assunto específico e não quer uma trilha inteira.
   */
  const aulas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return courses
      .flatMap((c) => c.lessons.map((l) => ({ aula: l, curso: c })))
      .filter(({ aula, curso }) => {
        if (fArea && curso.area !== fArea) return false
        if (fFormato === 'Vídeo' && !aula.has_video) return false
        if (fFormato === 'Texto' && aula.has_video) return false
        if (!q) return true
        return [aula.title, aula.summary, curso.title]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))
      })
  }, [courses, busca, fArea, fFormato])

  const labsFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return labs.filter((l) => {
      if (fNivel && l.level !== fNivel) return false
      if (!q) return true
      return [l.title, l.description].filter(Boolean).some((v) => v!.toLowerCase().includes(q))
    })
  }, [labs, busca, fNivel])

  const contagens = useMemo(
    () => ({ trilhas: courses.filter((c) => c.kind === 'trilha').length, eventos: eventos.length }),
    [courses, eventos],
  )

  async function onSalvar(courseId: string) {
    if (!userId) return
    const vai = !salvos.has(courseId)
    setSalvos((s) => {
      const n = new Set(s)
      vai ? n.add(courseId) : n.delete(courseId)
      return n
    })
    await toggleBookmark(userId, courseId, vai).catch(() => {})
    track(vai ? 'course_bookmarked' : 'course_unbookmarked', { course_id: courseId })
  }

  if (loading) return <PageLoading />
  if (error) {
    return (
      <div className="k-page" style={{ padding: '56px 48px' }}>
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    )
  }

  return (
    <div className="k-page k-enter" style={{ padding: '36px 36px 100px', maxWidth: 1276 }}>
      <h1 className="k-display k-page-title is-58" style={{ margin: '0 0 12px' }}>
        Explore a Academy
      </h1>
      <p style={{ fontSize: 15, color: 'var(--tx2)', margin: '0 0 26px' }}>
        Encontre o conteúdo certo para o seu momento e avance com mais confiança.
      </p>

      {/* ---------- busca ---------- */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Icon
          d={NAV_ICON.search}
          size={17}
          stroke="var(--tx3)"
          style={{ position: 'absolute', left: 20, top: 16 }}
        />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Busque por temas, cursos, trilhas ou palavras-chave..."
          style={{ ...inputStyle, borderRadius: 99, padding: '13px 20px 13px 48px', fontSize: 14 }}
        />
      </div>

      {/* ---------- filtros ---------- */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <Filtro
          label="Objetivo"
          valor={fObjetivo}
          opcoes={GOALS.map((g) => g.value)}
          onPick={(v) => setParam('objetivo', v)}
        />
        <Filtro
          label="Área"
          valor={fArea}
          opcoes={[...AREAS]}
          onPick={(v) => setParam('area', v)}
        />
        <Filtro
          label="Nível"
          valor={fNivel}
          opcoes={LEVELS.map((l) => l.value)}
          onPick={(v) => setParam('nivel', v)}
        />
        <Filtro
          label="Formato"
          valor={fFormato}
          opcoes={[...FORMATOS]}
          onPick={(v) => setParam('formato', v)}
        />
        <Filtro
          label="Duração"
          valor={fDuracao}
          opcoes={DURACOES.map((d) => d.label)}
          onPick={(v) => setParam('duracao', v)}
        />
      </div>

      {/* ---------- abas ---------- */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          borderBottom: '0.8px solid var(--line)',
          marginBottom: 30,
        }}
      >
        {(
          [
            ['Todos', 'todos', courses.length + eventos.length + labs.length],
            ['Trilhas', 'trilhas', contagens.trilhas],
            ['Aulas', 'aulas', aulas.length],
            ['Eventos', 'eventos', contagens.eventos],
            ['Labs', 'labs', labs.length],
          ] as const
        ).map(([label, key, n]) => (
          <button
            key={key}
            onClick={() => setParam('aba', key === 'todos' ? null : key)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2.4px solid ${aba === key ? 'var(--bronze)' : 'transparent'}`,
              color: aba === key ? 'var(--tx)' : 'var(--tx3)',
              padding: '10px 18px 12px',
              fontSize: 14,
              fontWeight: aba === key ? 600 : 400,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {label} <span style={{ color: 'var(--tx3)' }}>({n})</span>
          </button>
        ))}
      </div>

      {aba === 'eventos' ? (
        <ListaEventos eventos={eventos} isPaid={isPaid} />
      ) : aba === 'aulas' ? (
        <ListaAulas itens={aulas} isPaid={isPaid} />
      ) : aba === 'labs' ? (
        <ListaLabs labs={labsFiltrados} />
      ) : (
        <>
          <h1 className="k-display k-h2" style={{ marginBottom: 10 }}>
            {busca ? 'Resultados' : 'Recomendado para você'}
          </h1>
          <p style={{ color: 'var(--tx2)', fontSize: 15, margin: '0 0 28px', maxWidth: 680 }}>
            {busca
              ? `${filtrados.length} ${filtrados.length === 1 ? 'resultado' : 'resultados'} para "${busca}".`
              : profile?.goal
                ? `Com base no seu objetivo de ${profile.goal.toLowerCase()}, selecionamos conteúdos que podem impulsionar a sua jornada.`
                : 'Conteúdos para desenvolver as competências que a sua operação precisa.'}
          </p>

          {filtrados.length === 0 ? (
            <EmptyState
              title="Nada com esses filtros"
              message="Tente limpar um filtro ou buscar por outro termo."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtrados.map((c, i) => (
                <CardConteudo
                  key={c.id}
                  indice={i}
                  curso={c}
                  skills={skillsByCourse.get(c.id) ?? []}
                  isPaid={isPaid}
                  salvo={salvos.has(c.id)}
                  onSalvar={() => void onSalvar(c.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------

/**
 * Cartão de conteúdo da lista.
 *
 * No desenho ele é horizontal e a arte ocupa a altura inteira da
 * esquerda — não é uma miniatura com moldura. O selo TRILHA/CURSO fica
 * sobre a arte, e skills e botão vivem numa terceira coluna, à direita.
 */
function CardConteudo({
  curso,
  skills,
  isPaid,
  salvo,
  indice = 0,
  onSalvar,
}: {
  curso: CatalogCourse
  skills: Skill[]
  isPaid: boolean
  salvo: boolean
  indice?: number
  onSalvar: () => void
}) {
  const bloqueado = curso.status !== 'coming_soon' && !curso.hasFreeLesson && !isPaid
  const emBreve = curso.status === 'coming_soon'
  const cta = emBreve
    ? 'Em breve'
    : curso.progress > 0
      ? 'Continuar'
      : bloqueado
        ? 'Conhecer'
        : 'Começar'

  const nivel =
    curso.level && curso.level_max && curso.level !== curso.level_max
      ? `${curso.level} a ${curso.level_max}`
      : (curso.level ?? '')

  return (
    <article
      className="k-hoverable k-stack-mobile k-enter-i"
      style={{
        ['--i' as string]: indice,
        display: 'flex',
        background: 'var(--surface)',
        border: '0.8px solid var(--line)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* ---------- arte, altura inteira ---------- */}
      <Imagem
        src={curso.thumbnail_url}
        alt=""
        largura={220}
        altura="100%"
        raio={0}
        icone={areaIcon(curso.area)}
        tamanhoIcone={30}
        style={{ minHeight: 166 }}
      >
        <span
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            background: 'rgba(241,236,228,.92)',
            color: 'var(--imperial)',
            borderRadius: 99,
            padding: '3px 9px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          {curso.kind === 'trilha' ? 'TRILHA' : 'CURSO'}
        </span>

        {bloqueado && (
          <span
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              background: 'rgba(241,236,228,.92)',
              borderRadius: 8,
              padding: 5,
              display: 'flex',
            }}
          >
            <LockIcon size={13} color="var(--tx2)" />
          </span>
        )}
      </Imagem>

      {/* ---------- conteúdo ---------- */}
      <div style={{ flex: 1, minWidth: 0, padding: '20px 22px' }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: 'var(--bronze)',
            marginBottom: 7,
          }}
        >
          {[curso.area, curso.instructor_name].filter(Boolean).join(' · ')}
        </div>

        <Link to={`/conteudos/${curso.slug}`}>
          <h3
            className="k-display"
            style={{ fontSize: 20, lineHeight: 1.25, marginBottom: 8, color: 'var(--tx)' }}
          >
            {curso.title}
          </h3>
        </Link>

        {curso.short_description && (
          <p style={{ fontSize: 13, color: 'var(--tx2)', margin: '0 0 12px', lineHeight: 1.6 }}>
            {curso.short_description}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            gap: 18,
            flexWrap: 'wrap',
            fontSize: 12.5,
            color: 'var(--tx2)',
          }}
        >
          {nivel && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon d={NAV_ICON.level} size={13} stroke="var(--tx3)" />
              {nivel}
            </span>
          )}
          {curso.totalSeconds > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon d={NAV_ICON.clock} size={13} stroke="var(--tx3)" />
              {formatDuration(curso.totalSeconds)}
            </span>
          )}
          {curso.moduleCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon d={NAV_ICON.book} size={13} stroke="var(--tx3)" />
              {curso.moduleCount} {curso.moduleCount === 1 ? 'módulo' : 'módulos'}
            </span>
          )}
        </div>

        {curso.progress > 0 && (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 280, marginTop: 14 }}
          >
            <ProgressBar percent={curso.progress} height={4} />
            <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{curso.progress}%</span>
          </div>
        )}
      </div>

      {/* ---------- skills e ação ---------- */}
      <div
        style={{
          flex: 'none',
          width: 260,
          padding: '20px 20px 20px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {skills.slice(0, 3).map((s) => (
            <span
              key={s.id}
              style={{
                background: 'var(--bg)',
                color: 'var(--tx2)',
                borderRadius: 99,
                padding: '3px 9px',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {s.name}
            </span>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 12 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onSalvar}
            aria-label={salvo ? 'Remover dos salvos' : 'Salvar para depois'}
            title={salvo ? 'Remover dos salvos' : 'Salvar para depois'}
            className="k-hoverable k-press"
            style={{
              width: 40,
              height: 40,
              borderRadius: 9,
              border: '0.8px solid var(--line2)',
              background: 'var(--surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              d={NAV_ICON.bookmark}
              size={16}
              stroke={salvo ? 'var(--terracotta)' : 'var(--tx2)'}
            />
          </button>

          <Link
            to={`/conteudos/${curso.slug}`}
            style={{
              background: emBreve ? 'transparent' : 'var(--imperial)',
              border: emBreve ? '0.8px solid var(--line2)' : 'none',
              color: emBreve ? 'var(--tx2)' : 'var(--bg)',
              borderRadius: 9,
              padding: '10px 22px',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
            }}
          >
            {cta}
            {!emBreve && <Icon d={NAV_ICON.arrow} size={14} />}
          </Link>
        </div>
      </div>
    </article>
  )
}

function ListaEventos({ eventos, isPaid }: { eventos: AcademyEvent[]; isPaid: boolean }) {
  if (eventos.length === 0) {
    return (
      <EmptyState title="Nenhum evento" message="Assim que houver data marcada, aparece aqui." />
    )
  }

  return (
    <>
      <Kicker style={{ marginBottom: 18 }}>Encontros ao vivo e gravações</Kicker>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {eventos.map((e) => {
          const d = eventDay(e.starts_at)
          return (
            <Link
              key={e.id}
              to="/eventos"
              className="k-card k-hoverable"
              style={{ display: 'flex', alignItems: 'center', gap: 22, padding: 20 }}
            >
              <div style={{ textAlign: 'center', flex: 'none', width: 56 }}>
                <div className="k-display" style={{ fontSize: 26, lineHeight: 1 }}>
                  {d.dd}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: 'var(--tx2)',
                    marginTop: 4,
                  }}
                >
                  {d.mm}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
                  <Tag kind="soon" label={(e.format ?? 'ENCONTRO').toUpperCase()} />
                  <Tag kind={e.access_type === 'free' ? 'free' : isPaid ? 'unlocked' : 'paid'} />
                </div>
                <h3 className="k-display" style={{ fontSize: 18, lineHeight: 1.3 }}>
                  {e.title}
                </h3>
              </div>
              <span style={{ fontSize: 13, color: 'var(--tx2)' }}>
                {e.instructor_name ?? 'Time Kalidash'}
              </span>
            </Link>
          )
        })}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------

/** Aula solta, para quem busca um assunto e não uma trilha inteira. */
function ListaAulas({
  itens,
  isPaid,
}: {
  itens: { aula: CatalogCourse['lessons'][number]; curso: CatalogCourse }[]
  isPaid: boolean
}) {
  if (itens.length === 0) {
    return (
      <EmptyState
        title="Nenhuma aula com esses filtros"
        message="Tente limpar um filtro ou buscar por outro termo."
      />
    )
  }

  return (
    <>
      <h1 className="k-display k-h2" style={{ marginBottom: 10 }}>
        Aulas
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 15, margin: '0 0 28px', maxWidth: 680 }}>
        {itens.length} {itens.length === 1 ? 'aula' : 'aulas'} em todas as trilhas e cursos.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {itens.map(({ aula, curso }) => {
          const bloqueada = aula.effective_access === 'paid' && !isPaid
          return (
            <Link
              key={aula.id}
              to={bloqueada ? `/conteudos/${curso.slug}` : `/aula/${aula.id}`}
              className="k-card k-hoverable"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                color: 'var(--tx)',
              }}
            >
              <span
                style={{
                  flex: 'none',
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  d={aula.has_video ? NAV_ICON.play : NAV_ICON.book}
                  size={15}
                  stroke="var(--imperial)"
                />
              </span>

              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: 'var(--bronze)',
                    marginBottom: 5,
                  }}
                >
                  {curso.title}
                </span>
                <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>
                  {aula.title}
                </span>
                {aula.summary && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13,
                      color: 'var(--tx2)',
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}
                  >
                    {aula.summary}
                  </span>
                )}
              </span>

              <span
                style={{
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 12.5,
                  color: 'var(--tx2)',
                }}
              >
                {aula.has_video ? 'Vídeo' : 'Leitura'}
                {aula.duration_seconds ? ` · ${formatDuration(aula.duration_seconds)}` : ''}
                {bloqueada && <Tag kind="paid" />}
              </span>
            </Link>
          )
        })}
      </div>
    </>
  )
}

/** Labs no Explorar: a prática é conteúdo, então entra na busca também. */
function ListaLabs({ labs }: { labs: LabView[] }) {
  if (labs.length === 0) {
    return (
      <EmptyState
        title="Nenhum Lab com esses filtros"
        message="Tente limpar um filtro ou buscar por outro termo."
      />
    )
  }

  return (
    <>
      <h1 className="k-display k-h2" style={{ marginBottom: 10 }}>
        Kalidash Labs
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 15, margin: '0 0 28px', maxWidth: 680 }}>
        Exercícios para aplicar na sua operação. Abrem em Aplicar.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {labs.map((l) => (
          <Link
            key={l.id}
            to="/aplicar"
            className="k-card k-hoverable"
            style={{
              display: 'flex',
              gap: 16,
              padding: 16,
              color: 'var(--tx)',
              alignItems: 'center',
            }}
          >
            {l.image_url ? (
              <img
                src={l.image_url}
                alt=""
                style={{
                  flex: 'none',
                  width: 92,
                  height: 62,
                  objectFit: 'cover',
                  borderRadius: 10,
                }}
              />
            ) : (
              <span
                style={{
                  flex: 'none',
                  width: 92,
                  height: 62,
                  borderRadius: 10,
                  background: 'var(--bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon d={NAV_ICON.spark} size={18} stroke="var(--stone)" />
              </span>
            )}

            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15.5, fontWeight: 600, marginBottom: 5 }}>
                {l.title}
              </span>
              {l.description && (
                <span
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: 'var(--tx2)',
                    lineHeight: 1.5,
                    marginBottom: 8,
                  }}
                >
                  {l.description}
                </span>
              )}
              <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {l.skills.map((s) => (
                  <SkillChip key={s.id}>{s.name}</SkillChip>
                ))}
              </span>
            </span>

            <span style={{ flex: 'none', fontSize: 12.5, color: 'var(--tx2)' }}>
              {[l.is_case ? 'Case' : 'Lab', l.level, l.minutes ? `${l.minutes} min` : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}
