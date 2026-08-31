import type { PostHog } from 'posthog-js'
import { supabase } from './supabase'

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? '/ingest'

/**
 * O posthog-js pesa ~270 kB por causa do replay de sessão. Carregá-lo no
 * bundle principal atrasaria a primeira tela para todo mundo, inclusive
 * quem só vai ler uma aula. Então ele entra por import dinâmico, depois
 * que a página já está de pé, e o que acontecer antes disso fica numa
 * fila curta que é despejada quando ele chega.
 */
let ph: PostHog | null = null
let loading = false
const queue: Array<() => void> = []

function whenReady(fn: (client: PostHog) => void): void {
  if (ph) {
    fn(ph)
    return
  }
  if (queue.length < 50) queue.push(() => ph && fn(ph))
}

export function initAnalytics(): void {
  if (!KEY || loading || ph) return
  loading = true

  void import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        ui_host: 'https://us.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false, // disparamos na troca de rota do React Router
        autocapture: true, // "onde clica", sem instrumentar botão por botão
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '[data-private]',
        },
        persistence: 'localStorage+cookie',
        disable_session_recording: true, // ligado no identify
      })
      ph = posthog
      for (const job of queue.splice(0)) job()
    })
    .catch(() => {
      // bloqueador de anúncios, rede caindo: analytics some, app continua.
      loading = false
    })
}

/** Liga o comportamento à pessoa e começa o replay. */
export function identify(
  userId: string,
  traits: Record<string, unknown> = {},
): void {
  whenReady((client) => {
    client.identify(userId, traits)
    client.startSessionRecording()
  })
}

export function resetIdentity(): void {
  whenReady((client) => {
    client.stopSessionRecording()
    client.reset()
  })
}

export function trackPageview(path: string): void {
  whenReady((client) => {
    client.capture('$pageview', { $current_url: window.location.origin + path })
  })
}

/**
 * Eventos que também vão para o nosso banco.
 *
 * O PostHog recebe tudo — inclusive todo clique, via autocapture. Mas ele
 * cai com bloqueador de anúncios e tem teto no plano gratuito. Estes
 * poucos viram decisão de produto ("qual 'em breve' produzir", "onde a
 * trilha perde gente"), então precisam de número confiável e cruzável com
 * curso e aula. Ficam nos dois lugares, de propósito.
 */
const DURABLE = new Set([
  'course_viewed',
  'unlock_clicked',
  'lesson_started',
  'video_progress',
  'lesson_completed',
  'lesson_applied',
  'material_downloaded',
  'event_clicked',
])

export type TrackProps = {
  course_id?: string | null
  lesson_id?: string | null
  [key: string]: unknown
}

/** Registra um evento. Nunca lança: analytics não pode derrubar a aula. */
export function track(event: string, props: TrackProps = {}): void {
  whenReady((client) => {
    try {
      client.capture(event, props)
    } catch {
      /* ignora */
    }
  })

  if (DURABLE.has(event)) void persist(event, props)
}

async function persist(event: string, props: TrackProps): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user.id
    if (!userId) return // evento anônimo não tem valor para nós

    const { course_id = null, lesson_id = null, ...rest } = props

    await supabase.from('analytics_events').insert({
      user_id: userId,
      event,
      course_id,
      lesson_id,
      props: rest,
    })
  } catch {
    /* perder um evento não pode quebrar a página */
  }
}

/**
 * Marcos de vídeo: 25/50/75/100%. Cada marco dispara uma vez por aula,
 * por carregamento — senão o onTimeUpdate inundaria o banco.
 */
export function makeVideoMilestoneTracker(lessonId: string, courseId?: string | null) {
  const sent = new Set<number>()
  const marks = [25, 50, 75, 100]

  return (currentSeconds: number, totalSeconds: number) => {
    if (!totalSeconds || totalSeconds <= 0) return
    const pct = (currentSeconds / totalSeconds) * 100
    for (const m of marks) {
      if (pct >= m && !sent.has(m)) {
        sent.add(m)
        track('video_progress', {
          lesson_id: lessonId,
          course_id: courseId ?? null,
          percent: m,
        })
      }
    }
  }
}
