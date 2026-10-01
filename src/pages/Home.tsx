import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { loadContinue, recommendedFor, type CatalogCourse, type ContinueCard } from '../services/catalog'
import {
  loadJourney,
  loadLabs,
  loadSkills,
  persistSkills,
  type JourneyView,
  type LabView,
  type SkillProgress,
} from '../services/jornada'
import { supabase } from '../lib/supabase'
import { NAV_ICON } from '../lib/icons'
import { courseMeta, eventDay, eventTime, firstName, formatDuration, greeting } from '../lib/format'
import type { AcademyEvent, LessonOutline } from '../types/db'
import {
  CourseThumb,
  ErrorState,
  Icon,
  Kicker,
  PageLoading,
  ProgressBar,
  SkillChip,
  Tag,
} from '../components/ui'

export default function Home() {
  const { profile, isPaid, session } = useAuth()
  const { courses, loading, error, reload } = useCatalog()
  const userId = session?.user.id ?? null

  const [cont, setCont] = useState<ContinueCard | null>(null)
  const [skills, setSkills] = useState<SkillProgress[]>([])
  const [journey, setJourney] = useState<JourneyView | null>(null)
  const [labs, setLabs] = useState<LabView[]>([])
  const [nextEvent, setNextEvent] = useState<AcademyEvent | null>(null)
  const [extraLoading, setExtraLoading] = useState(true)

  useEffect(() => {
    if (loading || !userId) return
    let active = true
    setExtraLoading(true)

    Promise.all([
      loadContinue(userId, courses, isPaid).catch(() => null),
      loadSkills(userId).catch(() => [] as SkillProgress[]),
      loadJourney(userId).catch(() => null),
      loadLabs(userId).catch(() => [] as LabView[]),
      supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => (data as AcademyEvent | null) ?? null),
    ])
      .then(([c, s, j, l, e]) => {
        if (!active) return
        setCont(c)
        setSkills(s)
        setJourney(j)
        setLabs(l)
        setNextEvent(e)
        void persistSkills(userId, s)
      })
      .finally(() => {
        if (active) setExtraLoading(false)
      })

    return () => {
      active = false
    }
  }, [loading, courses, isPaid, userId])

  /** O lab sugerido: o primeiro que ainda não foi aplicado. */
  const proximoLab = useMemo(
    () => labs.find((l) => !l.is_case && !l.submission?.completed_at) ?? null,
    [labs],
  )

  const curtos = useMemo(
    () =>
      courses
        .flatMap((c) =>
          c.lessons
            .filter((l) => (l.duration_seconds ?? 0) > 0 && (l.duration_seconds ?? 0) <= 900)
            .map((l) => ({ lesson: l, course: c })),
        )
        .slice(0, 3),
    [courses],
  )

  const recomendados = useMemo(
    () => recommendedFor(courses, profile?.area ?? null, cont ? [cont.course.id] : [], 3),
    [courses, profile?.area, cont],
  )

  if (loading || extraLoading) return <PageLoading />

  if (error) {
    return (
      <div className="k-page" style={{ padding: '56px 56px' }}>
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    )
  }

  const nome = firstName(profile?.full_name)

  return (
    <div className="k-page" style={{ padding: '48px 48px 100px', maxWidth: 1320 }}>
      <Kicker style={{ marginBottom: 12 }}>
        {cont ? 'Bem-vinda de volta' : 'Comece aqui'}
      </Kicker>
      <h1 className="k-display k-h1" style={{ marginBottom: 10 }}>
        {cont ? `${greeting()}, ${nome || 'tudo bem'}.` : 'Bem-vinda ao Kalidash Academy.'}
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 16, margin: '0 0 40px' }}>
        {cont
          ? 'Continue de onde parou ou avance para sua próxima competência.'
          : 'Escolha por onde começar. Cada aula vem com uma aplicação na sua operação real.'}
      </p>

      <div
        className="k-grid-2"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.9fr) minmax(0,1fr)',
          gap: 20,
          marginBottom: 20,
        }}
      >
        {cont ? (
          <ContinueCardView cont={cont} skills={skills} />
        ) : (
          <ComeceAquiCard courses={courses} />
        )}
        <ProximoPassoCard lab={proximoLab} />
      </div>

      <div
        className="k-grid-2"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.9fr) minmax(0,1fr)',
          gap: 20,
          marginBottom: 20,
        }}
      >
        {journey ? <JornadaCard journey={journey} /> : <div />}
        <CompetenciasCard skills={skills} />
      </div>

      <div
        className="k-grid-2"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.9fr) minmax(0,1fr)',
          gap: 20,
        }}
      >
        <AulasCurtasCard itens={curtos} recomendados={recomendados} />
        {nextEvent ? <EventoCard evento={nextEvent} /> : <div />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------

function Card({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <section className="k-card" style={{ padding: 24, ...style }}>
      {children}
    </section>
  )
}

function ContinueCardView({ cont, skills }: { cont: ContinueCard; skills: SkillProgress[] }) {
  const restante = Math.max(
    0,
    Math.round(((cont.lesson.duration_seconds ?? 0) - cont.watchedSeconds) / 60),
  )
  const emFoco = skills.find((s) => s.progress > 0 && s.progress < 100) ?? skills[0]

  return (
    <Card>
      <Kicker style={{ marginBottom: 18 }}>Continue de onde parou</Kicker>

      <div className="k-stack-mobile" style={{ display: 'flex', gap: 22 }}>
        <Link to={`/aula/${cont.lesson.id}`} style={{ flex: 'none' }}>
          <div style={{ position: 'relative', width: 196 }}>
            <CourseThumb imageUrl={cont.course.thumbnail_url} width={196} height={118} radius={12} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon d={NAV_ICON.play} size={15} fill="var(--imperial)" />
              </div>
            </div>
          </div>
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--bronze)',
              marginBottom: 8,
            }}
          >
            {cont.course.title}
          </div>
          <Link to={`/aula/${cont.lesson.id}`}>
            <h3
              className="k-display"
              style={{ fontSize: 21, lineHeight: 1.25, marginBottom: 14, color: 'var(--tx)' }}
            >
              {cont.lesson.title}
            </h3>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <ProgressBar percent={cont.percent} height={4} />
            <span style={{ flex: 'none', fontSize: 12.5, color: 'var(--tx2)' }}>
              {cont.percent}%
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--tx2)', marginBottom: 20 }}>
            Aula {cont.position.index} de {cont.position.total}
            {restante > 0 ? ` · ${restante} min restantes` : ''}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {emFoco && (
              <div
                style={{
                  background: 'var(--surface2)',
                  border: '0.8px solid var(--line)',
                  borderRadius: 10,
                  padding: '9px 13px',
                }}
              >
                <div style={{ fontSize: 10.5, color: 'var(--tx2)' }}>Você está desenvolvendo</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{emFoco.name}</div>
              </div>
            )}
            <Link
              to={`/aula/${cont.lesson.id}`}
              style={{
                background: 'var(--imperial)',
                color: 'var(--bg)',
                borderRadius: 'var(--r-control)',
                padding: '11px 24px',
                fontSize: 14,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
              }}
            >
              Continuar
              <Icon d={NAV_ICON.arrow} size={16} />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}

function ComeceAquiCard({ courses }: { courses: CatalogCourse[] }) {
  const primeiro = courses.find((c) => c.status === 'published' && c.hasFreeLesson)
  const aula = primeiro?.lessons.find((l) => l.effective_access === 'free')

  if (!primeiro || !aula) {
    return (
      <Card>
        <Kicker style={{ marginBottom: 14 }}>Comece aqui</Kicker>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          Assim que o primeiro conteúdo for publicado, ele aparece aqui.
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <Kicker style={{ marginBottom: 18 }}>Comece aqui</Kicker>
      <div className="k-stack-mobile" style={{ display: 'flex', gap: 22 }}>
        <CourseThumb
          imageUrl={primeiro.thumbnail_url}
          width={196}
          height={118}
          radius={12}
          badge="GRATUITO"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="k-display" style={{ fontSize: 21, lineHeight: 1.25, marginBottom: 10 }}>
            {aula.title}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--tx2)', margin: '0 0 18px', lineHeight: 1.55 }}>
            {aula.summary ?? primeiro.short_description ?? ''}
          </p>
          <Link
            to={`/aula/${aula.id}`}
            style={{
              background: 'var(--imperial)',
              color: 'var(--bg)',
              borderRadius: 'var(--r-control)',
              padding: '11px 24px',
              fontSize: 14,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
            }}
          >
            Começar
            <Icon d={NAV_ICON.arrow} size={16} />
          </Link>
        </div>
      </div>
    </Card>
  )
}

function ProximoPassoCard({ lab }: { lab: LabView | null }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column' }}>
      <Kicker style={{ marginBottom: 16 }}>Próximo passo</Kicker>

      {lab ? (
        <>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--imperial)',
              color: 'var(--bg)',
              borderRadius: 999,
              padding: '5px 12px',
              fontSize: 11.5,
              fontWeight: 600,
              alignSelf: 'flex-start',
              marginBottom: 16,
            }}
          >
            <Icon d={NAV_ICON.spark} size={13} stroke="var(--champagne)" />
            Kalidash Lab
          </div>

          <h3 className="k-display" style={{ fontSize: 20, lineHeight: 1.25, marginBottom: 10 }}>
            {lab.title}
          </h3>
          <p style={{ fontSize: 14, color: 'var(--tx2)', margin: '0 0 20px', lineHeight: 1.55 }}>
            {lab.description}
          </p>

          <div style={{ flex: 1 }} />
          <Link
            to="/aplicar"
            className="k-hoverable"
            style={{
              border: '1px solid var(--line2)',
              borderRadius: 'var(--r-control)',
              padding: '11px 0',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--tx)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
            }}
          >
            Aplicar
            <Icon d={NAV_ICON.arrow} size={16} />
          </Link>
        </>
      ) : (
        <div style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.6 }}>
          Você aplicou tudo que está no ar. Assim que publicarmos um lab novo, ele aparece aqui.
        </div>
      )}
    </Card>
  )
}

function JornadaCard({ journey }: { journey: JourneyView }) {
  return (
    <Card>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 18,
        }}
      >
        <Kicker>Sua jornada</Kicker>
        <Link to="/jornada" style={{ fontSize: 13, color: 'var(--bronze)' }}>
          Ver jornada completa →
        </Link>
      </div>

      <h3 className="k-display" style={{ fontSize: 24, marginBottom: 28 }}>
        {journey.title}
      </h3>

      <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto' }}>
        {journey.steps.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{ width: 92, textAlign: 'center', flex: 'none' }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  margin: '0 auto 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  background: s.done || s.current ? 'var(--imperial)' : 'transparent',
                  border: s.done || s.current ? 'none' : '1px solid var(--line2)',
                  color: s.done || s.current ? 'var(--bg)' : 'var(--tx3)',
                }}
              >
                {s.done ? <Icon d={NAV_ICON.check} size={15} width={2.2} /> : i + 1}
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.35,
                  color: s.current ? 'var(--tx)' : 'var(--tx2)',
                  fontWeight: s.current ? 600 : 400,
                }}
              >
                {s.title}
              </div>
            </div>
            {i < journey.steps.length - 1 && (
              <div
                style={{
                  width: 26,
                  height: 1,
                  background: 'var(--line2)',
                  marginTop: 17,
                  flex: 'none',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

function CompetenciasCard({ skills }: { skills: SkillProgress[] }) {
  return (
    <Card>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <Kicker>Suas competências</Kicker>
        <Link to="/jornada" style={{ fontSize: 13, color: 'var(--bronze)' }}>
          Ver todas →
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {skills.map((s) => (
          <div key={s.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              {s.icon && <Icon d={s.icon} size={15} stroke="var(--tx2)" />}
              <span style={{ fontSize: 13.5, flex: 1 }}>{s.name}</span>
              <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{s.progress}%</span>
            </div>
            <ProgressBar percent={s.progress} height={4} />
          </div>
        ))}
      </div>
    </Card>
  )
}

function AulasCurtasCard({
  itens,
  recomendados,
}: {
  itens: { lesson: LessonOutline; course: CatalogCourse }[]
  recomendados: CatalogCourse[]
}) {
  return (
    <Card>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <Kicker>Aprenda em poucos minutos</Kicker>
        <Link to="/explorar" style={{ fontSize: 13, color: 'var(--bronze)' }}>
          Ver todos →
        </Link>
      </div>

      {itens.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))',
            gap: 18,
          }}
        >
          {itens.map(({ lesson, course }) => (
            <Link key={lesson.id} to={`/aula/${lesson.id}`} className="k-lift">
              <CourseThumb imageUrl={course.thumbnail_url} height={96} radius={10} />
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--bronze)',
                  margin: '12px 0 6px',
                }}
              >
                {course.area}
              </div>
              <div
                className="k-display"
                style={{ fontSize: 16, lineHeight: 1.3, marginBottom: 8, color: 'var(--tx)' }}
              >
                {lesson.title}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--tx2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon d={NAV_ICON.play} size={11} fill="var(--tx2)" />
                {formatDuration(lesson.duration_seconds)}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recomendados.map((c) => (
            <Link
              key={c.id}
              to={`/conteudos/${c.slug}`}
              className="k-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: 12,
                borderRadius: 10,
                color: 'var(--tx)',
              }}
            >
              <span style={{ flex: 1, fontSize: 14 }}>{c.title}</span>
              <SkillChip>{c.area}</SkillChip>
              <span style={{ fontSize: 12.5, color: 'var(--tx2)' }}>
                {courseMeta(c.moduleCount, c.lessonCount, c.totalSeconds)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

function EventoCard({ evento }: { evento: AcademyEvent }) {
  const d = eventDay(evento.starts_at)
  return (
    <Card style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <Kicker>Próximo evento</Kicker>
        <Link to="/eventos" style={{ fontSize: 13, color: 'var(--bronze)' }}>
          Ver todas →
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ textAlign: 'center', flex: 'none' }}>
          <div className="k-display" style={{ fontSize: 30, lineHeight: 1 }}>
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
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 9 }}>
            <Tag kind="soon" label="LIVE" />
            <Tag kind={evento.access_type === 'free' ? 'free' : 'paid'} />
          </div>
          <h3 className="k-display" style={{ fontSize: 18, lineHeight: 1.3 }}>
            {evento.title}
          </h3>
        </div>
      </div>

      <div
        style={{
          fontSize: 12.5,
          color: 'var(--tx2)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
        }}
      >
        <Icon d={NAV_ICON.clock} size={13} />
        {eventTime(evento.starts_at)} (BRT) · {evento.instructor_name ?? 'Time Kalidash'}
      </div>

      {evento.description && (
        <p style={{ fontSize: 14, color: 'var(--tx2)', margin: '0 0 20px', lineHeight: 1.55 }}>
          {evento.description}
        </p>
      )}

      <div style={{ flex: 1 }} />
      <Link
        to="/eventos"
        style={{
          background: 'var(--imperial)',
          color: 'var(--bg)',
          borderRadius: 'var(--r-control)',
          padding: '11px 0',
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
        }}
      >
        Inscrever-se
        <Icon d={NAV_ICON.arrow} size={16} />
      </Link>
    </Card>
  )
}
