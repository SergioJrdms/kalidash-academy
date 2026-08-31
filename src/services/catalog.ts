import { supabase } from '../lib/supabase'
import { canConsume, sortByTrail } from '../lib/access'
import type {
  Course,
  CourseModule,
  Lesson,
  LessonOutline,
  LessonProgress,
  MaterialOutline,
} from '../types/db'

export type CatalogCourse = Course & {
  modules: CourseModule[]
  lessons: LessonOutline[]
  moduleCount: number
  lessonCount: number
  totalSeconds: number
  /** aulas que o usuário concluiu neste curso */
  completedCount: number
  /** 0..100 */
  progress: number
  /** o usuário pode consumir ao menos uma aula deste curso? */
  hasFreeLesson: boolean
  /** todas as aulas exigem acesso pago */
  fullyLocked: boolean
}

type Bundle = {
  courses: Course[]
  modules: CourseModule[]
  lessons: LessonOutline[]
  progress: LessonProgress[]
}

/**
 * Carrega o catálogo inteiro em 4 queries. É pequeno o bastante para isso
 * e evita N+1 nas telas de Home e Conteúdos.
 */
export async function loadCatalog(userId: string | null): Promise<CatalogCourse[]> {
  const [coursesRes, modulesRes, lessonsRes, progressRes] = await Promise.all([
    supabase
      .from('courses')
      .select('*')
      .in('status', ['published', 'coming_soon'])
      .order('sort_order', { ascending: true }),
    supabase.from('course_modules').select('*').order('sort_order', { ascending: true }),
    supabase.from('lesson_outline').select('*').order('sort_order', { ascending: true }),
    userId
      ? supabase.from('lesson_progress').select('*').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (coursesRes.error) throw new Error(coursesRes.error.message)
  if (modulesRes.error) throw new Error(modulesRes.error.message)
  if (lessonsRes.error) throw new Error(lessonsRes.error.message)

  return assemble({
    courses: (coursesRes.data ?? []) as Course[],
    modules: (modulesRes.data ?? []) as CourseModule[],
    lessons: (lessonsRes.data ?? []) as LessonOutline[],
    progress: (progressRes.data ?? []) as LessonProgress[],
  })
}

function assemble(b: Bundle): CatalogCourse[] {
  const completed = new Set(
    b.progress.filter((p) => p.completed_at).map((p) => p.lesson_id),
  )

  return b.courses.map((course) => {
    const modules = b.modules
      .filter((m) => m.course_id === course.id)
      .sort((a, z) => a.sort_order - z.sort_order)

    const moduleOrder = new Map(modules.map((m, i) => [m.id, i]))

    const lessons = sortByTrail(
      b.lessons.filter((l) => l.course_id === course.id),
      moduleOrder,
    )

    const totalSeconds = lessons.reduce((acc, l) => acc + (l.duration_seconds ?? 0), 0)
    const completedCount = lessons.filter((l) => completed.has(l.id)).length

    return {
      ...course,
      modules,
      lessons,
      moduleCount: modules.filter((m) => lessons.some((l) => l.module_id === m.id)).length,
      lessonCount: lessons.length,
      totalSeconds,
      completedCount,
      progress: lessons.length === 0 ? 0 : Math.round((completedCount / lessons.length) * 100),
      hasFreeLesson: lessons.some((l) => l.effective_access === 'free'),
      fullyLocked: lessons.length > 0 && lessons.every((l) => l.effective_access === 'paid'),
    }
  })
}

/** Uma aula está liberada para este usuário? Espelha a regra do servidor. */
export function isLessonUnlocked(lesson: LessonOutline, isPaid: boolean): boolean {
  return canConsume(lesson.effective_access, isPaid)
}

/** A próxima aula da trilha, na ordem módulo -> aula. */
export function nextLessonOf(
  course: CatalogCourse,
  currentLessonId: string,
): LessonOutline | null {
  const i = course.lessons.findIndex((l) => l.id === currentLessonId)
  if (i < 0 || i >= course.lessons.length - 1) return null
  return course.lessons[i + 1]
}

/** "Aula 2 de 6" */
export function lessonPosition(
  course: CatalogCourse,
  lessonId: string,
): { index: number; total: number } {
  const i = course.lessons.findIndex((l) => l.id === lessonId)
  return { index: i < 0 ? 0 : i + 1, total: course.lessons.length }
}

// ---------------------------------------------------------------------
// Aula
// ---------------------------------------------------------------------

export type LessonView = {
  /** presente só quando o usuário tem acesso (RLS decide) */
  full: Lesson | null
  outline: LessonOutline
  materials: MaterialOutline[]
  progress: LessonProgress | null
}

export async function loadLesson(
  lessonId: string,
  userId: string | null,
): Promise<LessonView | null> {
  const [fullRes, outlineRes, materialsRes, progressRes] = await Promise.all([
    supabase.from('lessons').select('*').eq('id', lessonId).maybeSingle(),
    supabase.from('lesson_outline').select('*').eq('id', lessonId).maybeSingle(),
    supabase
      .from('material_outline')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('sort_order', { ascending: true }),
    userId
      ? supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const outline = outlineRes.data as LessonOutline | null
  if (!outline) return null

  return {
    full: (fullRes.data as Lesson | null) ?? null,
    outline,
    materials: (materialsRes.data ?? []) as MaterialOutline[],
    progress: (progressRes.data as LessonProgress | null) ?? null,
  }
}

// ---------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------

export type ContinueCard = {
  course: CatalogCourse
  lesson: LessonOutline
  watchedSeconds: number
  percent: number
  position: { index: number; total: number }
}

/**
 * "Continue de onde parou": a aula mexida mais recentemente que ainda não
 * foi concluída. Se todas as tocadas estiverem concluídas, aponta para a
 * próxima aula liberada da mesma trilha.
 */
export async function loadContinue(
  userId: string,
  catalog: CatalogCourse[],
  isPaid: boolean,
): Promise<ContinueCard | null> {
  const { data } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(30)

  const rows = (data ?? []) as LessonProgress[]
  if (rows.length === 0) return null

  const findCourse = (lessonId: string) =>
    catalog.find((c) => c.lessons.some((l) => l.id === lessonId)) ?? null

  // 1) aula começada e não concluída
  for (const row of rows) {
    if (row.completed_at) continue
    const course = findCourse(row.lesson_id)
    if (!course) continue
    const lesson = course.lessons.find((l) => l.id === row.lesson_id)!
    if (!isLessonUnlocked(lesson, isPaid)) continue
    return buildCard(course, lesson, row.watched_seconds)
  }

  // 2) próxima aula liberada depois da última concluída
  for (const row of rows) {
    const course = findCourse(row.lesson_id)
    if (!course) continue
    const next = nextLessonOf(course, row.lesson_id)
    if (next && isLessonUnlocked(next, isPaid)) {
      return buildCard(course, next, 0)
    }
  }

  return null

  function buildCard(
    course: CatalogCourse,
    lesson: LessonOutline,
    watched: number,
  ): ContinueCard {
    const dur = lesson.duration_seconds ?? 0
    return {
      course,
      lesson,
      watchedSeconds: watched,
      percent: dur > 0 ? Math.min(100, Math.round((watched / dur) * 100)) : 0,
      position: lessonPosition(course, lesson.id),
    }
  }
}

/**
 * Recomendação simples, como definido: prioriza a área do usuário e,
 * em seguida, Gestão. Sem algoritmo.
 */
export function recommendedFor(
  catalog: CatalogCourse[],
  area: string | null,
  excludeCourseIds: string[] = [],
  limit = 2,
): CatalogCourse[] {
  const excluded = new Set(excludeCourseIds)
  const score = (c: CatalogCourse) => {
    if (area && c.area === area) return 0
    if (c.area === 'Gestão') return 1
    return 2
  }
  return catalog
    .filter((c) => !excluded.has(c.id))
    .slice()
    .sort((a, z) => score(a) - score(z) || a.sort_order - z.sort_order)
    .slice(0, limit)
}

/** Aba "Para você": gratuitos, liberados e os da área do usuário. */
export function forYou(
  catalog: CatalogCourse[],
  area: string | null,
  isPaid: boolean,
): CatalogCourse[] {
  return catalog.filter(
    (c) =>
      c.access_type === 'free' ||
      c.hasFreeLesson ||
      isPaid ||
      (area != null && c.area === area),
  )
}
