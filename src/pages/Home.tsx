import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import {
  loadContinue,
  recommendedFor,
  type CatalogCourse,
  type ContinueCard,
} from '../services/catalog'
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
import { NAV_ICON, areaIcon } from '../lib/icons'
import { courseMeta, eventDay, eventTime, firstName, greeting } from '../lib/format'
import type { AcademyEvent, LessonOutline } from '../types/db'
import {
  CourseThumb,
  ErrorState,
  Icon,
  Kicker,
  PageLoading,
  ProgressBar,
  SkillChip,
} from '../components/ui'

/**
 * O evento do cartao da direita.
 *
 * Procura o proximo marcado. Se nao houver nenhum pela frente — e isso
 * acontece sempre que a agenda fica sem data nova — devolve o ultimo que
 * ja aconteceu, para o cartao continuar existindo. Antes, nesse caso o
 * lugar dele na grade ficava simplesmente vazio.
 */
async function carregarEvento(): Promise<AcademyEvent | null> {
  const agora = new Date().toISOString()

  const { data: proximo } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'published')
    .gte('starts_at', agora)
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (proximo) return proximo as AcademyEvent

  const { data: ultimo } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'published')
    .lt('starts_at', agora)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (ultimo as AcademyEvent | null) ?? null
}

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
      carregarEvento(),
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

  /**
   * A competência em foco: a que está em andamento e mais perto de virar.
   * É ela que aparece no cartão de continuar e em destaque na lista.
   */
  const emFoco = useMemo(() => {
    const andamento = skills.filter((s) => s.progress > 0 && s.progress < 100)
    if (andamento.length === 0) return skills[0] ?? null
    return andamento.reduce((a, b) => (b.progress > a.progress ? b : a))
  }, [skills])

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
      <div className="k-page" style={{ padding: '48px 48px' }}>
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    )
  }

  const nome = firstName(profile?.full_name)

  return (
    <div className="k-page" style={{ padding: '44px 48px 100px', maxWidth: 1320 }}>
      <Kicker style={{ marginBottom: 14 }}>
        {cont ? 'Bem-vinda de volta' : 'Comece aqui'}
      </Kicker>
      <h1 className="k-display k-page-title is-52" style={{ margin: '0 0 14px' }}>
        {cont ? `${greeting()}, ${nome || 'tudo bem'}.` : 'Bem-vinda ao Kalidash Academy.'}
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 16.5, margin: '0 0 36px' }}>
        {cont
          ? 'Continue de onde parou ou avance para sua próxima competência.'
          : 'Escolha por onde começar. Cada aula vem com uma aplicação na sua operação real.'}
      </p>

      <div className="k-home-grid">
        {cont ? (
          <ContinueCardView cont={cont} emFoco={emFoco} />
        ) : (
          <ComeceAquiCard courses={courses} />
        )}
        <ProximoPassoCard lab={proximoLab} />

        {journey ? (
          <JornadaCard journey={journey} />
        ) : (
          <CartaoVazio
            titulo="Sua jornada"
            texto="Assim que uma trilha for publicada, o seu caminho aparece aqui."
            para="/explorar"
            cta="Explorar conteúdos"
          />
        )}
        <CompetenciasCard skills={skills} emFoco={emFoco} />

        <AulasCurtasCard itens={curtos} recomendados={recomendados} />
        {nextEvent ? (
          <EventoCard evento={nextEvent} />
        ) : (
          <CartaoVazio
            titulo="Próximo evento"
            texto="Nenhum encontro publicado por enquanto. Quando a próxima data sair, ela aparece aqui."
            para="/eventos"
            cta="Ver eventos"
          />
        )}
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
    <section className="k-card" style={{ padding: 26, ...style }}>
      {children}
    </section>
  )
}

/** Cabeçalho de cartão: kicker à esquerda, link discreto à direita. */
function CardHead({
  titulo,
  to,
  linkLabel,
}: {
  titulo: string
  to?: string
  linkLabel?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 20,
      }}
    >
      <Kicker>{titulo}</Kicker>
      {to && linkLabel && (
        <Link
          to={to}
          style={{
            fontSize: 13,
            color: 'var(--bronze)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {linkLabel}
          <Icon d={NAV_ICON.arrow} size={14} stroke="var(--bronze)" />
        </Link>
      )}
    </div>
  )
}

function ContinueCardView({
  cont,
  emFoco,
}: {
  cont: ContinueCard
  emFoco: SkillProgress | null
}) {
  const restante = Math.max(
    0,
    Math.round(((cont.lesson.duration_seconds ?? 0) - cont.watchedSeconds) / 60),
  )

  return (
    <Card>
      <Kicker style={{ marginBottom: 20 }}>Continue de onde parou</Kicker>

      <div className="k-stack-mobile" style={{ display: 'flex', gap: 26 }}>
        <Link to={`/aula/${cont.lesson.id}`} style={{ flex: 'none' }}>
          <div style={{ position: 'relative', width: 260 }}>
            <CourseThumb
              imageUrl={cont.lesson.thumbnail_url ?? cont.course.thumbnail_url}
              iconPath={areaIcon(cont.course.area)}
              width={260}
              height={166}
              radius={12}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,.92)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingLeft: 3,
                }}
              >
                <Icon d={NAV_ICON.play} size={16} fill="var(--imperial)" />
              </span>
            </div>
          </div>
        </Link>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--tx2)',
              marginBottom: 10,
            }}
          >
            {cont.course.title}
          </div>

          <Link to={`/aula/${cont.lesson.id}`}>
            <h3
              className="k-display"
              style={{ fontSize: 25, lineHeight: 1.22, marginBottom: 18, color: 'var(--tx)' }}
            >
              {cont.lesson.title}
            </h3>
          </Link>

          <div style={{ display: 'flex', marginBottom: 10 }}>
            <ProgressBar percent={cont.percent} height={5} />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: 22,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--tx2)' }}>
              Aula {cont.position.index} de {cont.position.total}
              {restante > 0 ? ` · ${restante} min restantes` : ''}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--bronze)' }}>
              {cont.percent}%
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <div
            className="k-stack-mobile"
            style={{ display: 'flex', alignItems: 'stretch', gap: 14 }}
          >
            {emFoco && (
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  background: 'var(--surface2)',
                  border: '0.8px solid var(--line)',
                  borderRadius: 'var(--r-control)',
                  padding: '10px 14px',
                }}
              >
                {emFoco.icon && (
                  <Icon d={emFoco.icon} size={17} stroke="var(--terracotta)" width={1.6} />
                )}
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--tx2)' }}>
                    Você está desenvolvendo:
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13.5,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {emFoco.name}
                  </span>
                </span>
              </div>
            )}

            <Link
              to={`/aula/${cont.lesson.id}`}
              style={{
                flex: 'none',
                background: 'var(--imperial)',
                color: 'var(--bg)',
                borderRadius: 'var(--r-control)',
                padding: '0 26px',
                fontSize: 14.5,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
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
      <Kicker style={{ marginBottom: 20 }}>Comece aqui</Kicker>
      <div className="k-stack-mobile" style={{ display: 'flex', gap: 26 }}>
        <CourseThumb
          imageUrl={aula.thumbnail_url ?? primeiro.thumbnail_url}
          iconPath={areaIcon(primeiro.area)}
          width={260}
          height={166}
          radius={12}
          badge="GRATUITO"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="k-display" style={{ fontSize: 25, lineHeight: 1.22, marginBottom: 12 }}>
            {aula.title}
          </h3>
          <p style={{ fontSize: 14.5, color: 'var(--tx2)', margin: '0 0 22px', lineHeight: 1.55 }}>
            {aula.summary ?? primeiro.short_description ?? ''}
          </p>
          <Link
            to={`/aula/${aula.id}`}
            style={{
              background: 'var(--imperial)',
              color: 'var(--bg)',
              borderRadius: 'var(--r-control)',
              padding: '12px 26px',
              fontSize: 14.5,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
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

/** O monograma da marca dentro do selo do Lab: quadrado escuro, K claro. */
function MonogramaK() {
  return (
    <span
      style={{
        flex: 'none',
        width: 26,
        height: 26,
        borderRadius: 7,
        background: 'var(--imperial)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 14,
        color: 'var(--champagne)',
        lineHeight: 1,
      }}
    >
      K
    </span>
  )
}

function ProximoPassoCard({ lab }: { lab: LabView | null }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/*
        A lavagem pastel no canto faz parte do desenho do cartão, não do
        conteúdo: nenhum Lab tem imagem cadastrada e, mesmo quando tiver,
        o canto continua sendo um degradê suave. Por isso ela é desenhada
        em CSS e a foto do Lab, quando existe, entra por cima dela.
      */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 178,
          height: 122,
          backgroundImage: [
            lab?.image_url ? `url(${JSON.stringify(lab.image_url)})` : null,
            'radial-gradient(62% 72% at 70% 14%, rgba(176,199,222,.38), transparent 72%)',
            'radial-gradient(58% 66% at 99% 40%, rgba(219,193,201,.34), transparent 74%)',
            'radial-gradient(80% 90% at 96% 0%, rgba(233,214,172,.30), transparent 78%)',
          ]
            .filter(Boolean)
            .join(', '),
          backgroundSize: lab?.image_url ? 'cover, auto, auto, auto' : undefined,
          backgroundPosition: lab?.image_url ? 'center, 0 0, 0 0, 0 0' : undefined,
          backgroundRepeat: 'no-repeat',
          opacity: lab?.image_url ? 0.55 : 1,
          WebkitMaskImage:
            'radial-gradient(110% 105% at 100% 0%, #000 12%, rgba(0,0,0,.34) 50%, transparent 76%)',
          maskImage:
            'radial-gradient(110% 105% at 100% 0%, #000 12%, rgba(0,0,0,.34) 50%, transparent 76%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative' }}>
        <Kicker style={{ marginBottom: 18 }}>Próximo passo</Kicker>

        {lab ? (
          <>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--bg)',
                color: 'var(--tx)',
                borderRadius: 'var(--r-control)',
                padding: '5px 16px 5px 5px',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 22,
              }}
            >
              <MonogramaK />
              Kalidash Lab
            </div>

            <h3 className="k-display" style={{ fontSize: 24, lineHeight: 1.25, marginBottom: 14 }}>
              {lab.title}
            </h3>
            <p style={{ fontSize: 15, color: 'var(--tx2)', margin: '0 0 24px', lineHeight: 1.65 }}>
              {lab.description}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 15, color: 'var(--tx2)', lineHeight: 1.65, margin: '0 0 24px' }}>
            Você aplicou tudo que está no ar. Assim que publicarmos um Lab novo, ele aparece aqui.
          </p>
        )}
      </div>

      <div style={{ flex: 1 }} />
      <Link
        to="/aplicar"
        className="k-hoverable"
        style={{
          position: 'relative',
          border: '0.8px solid var(--line2)',
          borderRadius: 'var(--r-control)',
          padding: '14px 0',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--tx)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {lab ? 'Aplicar' : 'Ver os Labs'}
        <Icon d={NAV_ICON.arrow} size={16} />
      </Link>
    </Card>
  )
}

function JornadaCard({ journey }: { journey: JourneyView }) {
  return (
    <Card>
      <CardHead titulo="Sua jornada" to="/jornada" linkLabel="Ver jornada completa" />

      <h3 className="k-display" style={{ fontSize: 28, marginBottom: 34 }}>
        {journey.title}
      </h3>

      <div style={{ display: 'flex', alignItems: 'flex-start', paddingBottom: 4 }}>
        {journey.steps.map((s, i) => {
          const feito = s.done
          const atual = s.current
          // o traço até a próxima etapa só é escuro enquanto a trilha já foi andada
          const trilhaAndada = feito
          return (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                // so os trechos com traco esticam; o ultimo fecha no rotulo
                flex: i < journey.steps.length - 1 ? '1 1 auto' : '0 0 auto',
                minWidth: 0,
              }}
            >
              {/* a etapa ocupa a largura do proprio rotulo; quem estica sao
                  os tracos, como no desenho */}
              <div style={{ flex: '0 1 auto', maxWidth: 164, textAlign: 'center' }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 600,
                    background: feito || atual ? 'var(--imperial)' : 'transparent',
                    border: feito || atual ? 'none' : '1px solid var(--line2)',
                    color: feito || atual ? 'var(--bg)' : 'var(--tx3)',
                    boxShadow: atual ? '0 0 0 5px rgba(40,24,59,.12)' : 'none',
                  }}
                >
                  {feito ? <Icon d={NAV_ICON.check} size={16} width={2.4} /> : i + 1}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    lineHeight: 1.35,
                    color: atual ? 'var(--tx)' : feito ? 'var(--tx2)' : 'var(--tx3)',
                    fontWeight: atual ? 600 : 400,
                  }}
                >
                  {s.title}
                </span>
              </div>

              {i < journey.steps.length - 1 && (
                <span
                  style={{
                    flex: 1,
                    minWidth: 14,
                    height: 1.5,
                    marginTop: 18.5,
                    borderRadius: 999,
                    background: trilhaAndada ? 'var(--imperial)' : 'var(--line2)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function CompetenciasCard({
  skills,
  emFoco,
}: {
  skills: SkillProgress[]
  emFoco: SkillProgress | null
}) {
  return (
    <Card>
      <CardHead titulo="Suas competências" to="/jornada" linkLabel="Ver todas" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {skills.map((s) => {
          const foco = s.id === emFoco?.id
          return (
            <div key={s.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 9 }}>
                {s.icon && (
                  <Icon
                    d={s.icon}
                    size={16}
                    width={1.6}
                    stroke={foco ? 'var(--terracotta)' : 'var(--tx2)'}
                  />
                )}
                <span style={{ fontSize: 14, flex: 1, minWidth: 0 }}>{s.name}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.progress}%</span>
              </div>
              <ProgressBar percent={s.progress} height={5} />
            </div>
          )
        })}
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
      <CardHead titulo="Aprenda em poucos minutos" to="/explorar?aba=aulas" linkLabel="Ver todos" />

      {itens.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(itens.length, 3)}, minmax(0,1fr))`,
            gap: 24,
          }}
        >
          {itens.map(({ lesson, course }) => (
            <Link
              key={lesson.id}
              to={`/aula/${lesson.id}`}
              className="k-lift"
              style={{ display: 'flex', flexDirection: 'column', color: 'var(--tx)' }}
            >
              <CourseThumb
                imageUrl={lesson.thumbnail_url ?? course.thumbnail_url}
                iconPath={areaIcon(course.area)}
                height={126}
                radius={10}
              />
              <span
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--bronze)',
                  margin: '16px 0 8px',
                }}
              >
                {course.area}
              </span>
              <span
                className="k-display"
                style={{ display: 'block', fontSize: 18, lineHeight: 1.26, marginBottom: 9 }}
              >
                {lesson.title}
              </span>
              <span
                style={{
                  display: 'block',
                  fontSize: 13.5,
                  color: 'var(--tx2)',
                  lineHeight: 1.5,
                  marginBottom: 16,
                }}
              >
                {lesson.summary ?? course.short_description ?? ''}
              </span>

              <span style={{ flex: 1 }} />
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 13,
                    color: 'var(--tx2)',
                  }}
                >
                  <Icon d={NAV_ICON.play} size={11} fill="var(--tx2)" />
                  {Math.max(1, Math.round((lesson.duration_seconds ?? 0) / 60))} min
                </span>
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: '0.8px solid var(--line2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon d={NAV_ICON.arrow} size={14} stroke="var(--tx2)" />
                </span>
              </span>
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

/** Selo do evento: "LIVE", "GRATUITO". Tom terracota, como no desenho. */
function SeloEvento({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: 'rgba(183,101,77,.11)',
        color: 'var(--terracotta)',
        borderRadius: 6,
        padding: '4px 9px',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  )
}

function EventoCard({ evento }: { evento: AcademyEvent }) {
  const d = eventDay(evento.starts_at)
  const jaPassou = new Date(evento.starts_at).getTime() < Date.now()
  const aoVivo = !jaPassou && !evento.recording_url
  const temGravacao = Boolean(evento.recording_url)

  return (
    <Card style={{ display: 'flex', flexDirection: 'column' }}>
      <CardHead
        titulo={jaPassou ? 'Último evento' : 'Próximo evento'}
        to="/eventos"
        linkLabel="Ver todas"
      />

      <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
        <div style={{ textAlign: 'center', flex: 'none', paddingTop: 2 }}>
          <div className="k-display" style={{ fontSize: 34, lineHeight: 1 }}>
            {d.dd}
          </div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.11em',
              color: 'var(--tx2)',
              marginTop: 5,
            }}
          >
            {d.mm}
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 7, marginBottom: 11, flexWrap: 'wrap' }}>
            {aoVivo && <SeloEvento>Live</SeloEvento>}
            {jaPassou && temGravacao && <SeloEvento>Gravação</SeloEvento>}
            {jaPassou && !temGravacao && <SeloEvento>Encerrado</SeloEvento>}
            <SeloEvento>{evento.access_type === 'free' ? 'Gratuito' : 'Premium'}</SeloEvento>
          </div>
          <h3 className="k-display" style={{ fontSize: 20, lineHeight: 1.26 }}>
            {evento.title}
          </h3>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          flexWrap: 'wrap',
          fontSize: 13,
          color: 'var(--tx2)',
          marginBottom: 16,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <Icon d={NAV_ICON.clock} size={14} stroke="var(--tx3)" />
          {eventTime(evento.starts_at)} (BRT)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <Icon d={NAV_ICON.comunidade} size={14} stroke="var(--tx3)" />
          {evento.instructor_name ?? 'Time Kalidash'}
        </span>
      </div>

      {evento.description && (
        <p style={{ fontSize: 14.5, color: 'var(--tx2)', margin: '0 0 24px', lineHeight: 1.55 }}>
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
          padding: '13px 0',
          fontSize: 14.5,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {jaPassou ? (temGravacao ? 'Assistir gravação' : 'Ver eventos') : 'Inscrever-se'}
        <Icon d={NAV_ICON.arrow} size={16} />
      </Link>
    </Card>
  )
}

/**
 * Preenche uma celula da grade quando o dado dela nao existe. Sem isto o
 * lugar fica em branco e a tela parece quebrada — foi o que aconteceu
 * com o cartao de evento quando a agenda ficou sem data futura.
 */
function CartaoVazio({
  titulo,
  texto,
  para,
  cta,
}: {
  titulo: string
  texto: string
  para: string
  cta: string
}) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column' }}>
      <Kicker style={{ marginBottom: 16 }}>{titulo}</Kicker>
      <p style={{ fontSize: 15, color: 'var(--tx2)', lineHeight: 1.6, margin: '0 0 22px' }}>
        {texto}
      </p>
      <div style={{ flex: 1 }} />
      <Link
        to={para}
        className="k-hoverable"
        style={{
          border: '0.8px solid var(--line2)',
          borderRadius: 'var(--r-control)',
          padding: '12px 0',
          fontSize: 14.5,
          fontWeight: 600,
          color: 'var(--tx)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {cta}
        <Icon d={NAV_ICON.arrow} size={16} />
      </Link>
    </Card>
  )
}
