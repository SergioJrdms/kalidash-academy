import { supabase } from '../lib/supabase'
import type {
  Journey,
  JourneyStep,
  Lab,
  LabSubmission,
  LessonQuiz,
  Skill,
  UserSkill,
} from '../types/db'

// ---------------------------------------------------------------------
// Competências
// ---------------------------------------------------------------------

export type SkillProgress = Skill & { progress: number }

/**
 * Competências com o progresso da pessoa.
 *
 * O progresso não é gravado à mão: é derivado das aulas concluídas dos
 * cursos que desenvolvem cada competência, mais os labs aplicados. Assim
 * ele não mente quando o admin publica conteúdo novo.
 */
export async function loadSkills(userId: string | null): Promise<SkillProgress[]> {
  const [skillsRes, mapRes, progressRes, labMapRes, labSubRes] = await Promise.all([
    supabase.from('skills').select('*').order('sort_order'),
    supabase.from('course_skills').select('course_id, skill_id'),
    userId
      ? supabase.from('lesson_progress').select('lesson_id, completed_at').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('lab_skills').select('lab_id, skill_id'),
    userId
      ? supabase.from('lab_submissions').select('lab_id, completed_at').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (skillsRes.error) throw new Error(skillsRes.error.message)

  const skills = (skillsRes.data ?? []) as Skill[]
  const courseSkills = (mapRes.data ?? []) as { course_id: string; skill_id: string }[]
  const labSkills = (labMapRes.data ?? []) as { lab_id: string; skill_id: string }[]

  const doneLessons = new Set(
    ((progressRes.data ?? []) as { lesson_id: string; completed_at: string | null }[])
      .filter((p) => p.completed_at)
      .map((p) => p.lesson_id),
  )
  const doneLabs = new Set(
    ((labSubRes.data ?? []) as { lab_id: string; completed_at: string | null }[])
      .filter((s) => s.completed_at)
      .map((s) => s.lab_id),
  )

  // aulas por curso, para saber o denominador
  const { data: outline } = await supabase
    .from('lesson_outline')
    .select('id, course_id')

  const lessonsByCourse = new Map<string, string[]>()
  for (const l of (outline ?? []) as { id: string; course_id: string }[]) {
    const arr = lessonsByCourse.get(l.course_id) ?? []
    arr.push(l.id)
    lessonsByCourse.set(l.course_id, arr)
  }

  return skills.map((s) => {
    const cursos = courseSkills.filter((cs) => cs.skill_id === s.id).map((cs) => cs.course_id)
    const aulas = cursos.flatMap((c) => lessonsByCourse.get(c) ?? [])
    const labs = labSkills.filter((ls) => ls.skill_id === s.id).map((ls) => ls.lab_id)

    const total = aulas.length + labs.length
    if (total === 0) return { ...s, progress: 0 }

    const feitos =
      aulas.filter((a) => doneLessons.has(a)).length + labs.filter((l) => doneLabs.has(l)).length

    return { ...s, progress: Math.round((feitos / total) * 100) }
  })
}

/** Grava o progresso calculado, para o Admin conseguir ler depois. */
export async function persistSkills(userId: string, skills: SkillProgress[]): Promise<void> {
  if (skills.length === 0) return
  const rows = skills.map((s) => ({
    user_id: userId,
    skill_id: s.id,
    progress: s.progress,
  }))
  const { error } = await supabase
    .from('user_skills')
    .upsert(rows, { onConflict: 'user_id,skill_id' })
  if (error) console.warn('user_skills', error.message)
}

// ---------------------------------------------------------------------
// Jornada
// ---------------------------------------------------------------------

export type JourneyView = Journey & {
  steps: (JourneyStep & { done: boolean; current: boolean })[]
  currentIndex: number
}

export async function loadJourney(userId: string | null): Promise<JourneyView | null> {
  const [jRes, sRes, pRes] = await Promise.all([
    supabase.from('journeys').select('*').order('sort_order').limit(1).maybeSingle(),
    supabase.from('journey_steps').select('*').order('sort_order'),
    userId
      ? supabase.from('lesson_progress').select('lesson_id, completed_at').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ])

  const journey = jRes.data as Journey | null
  if (!journey) return null

  const steps = ((sRes.data ?? []) as JourneyStep[]).filter((s) => s.journey_id === journey.id)

  const done = new Set(
    ((pRes.data ?? []) as { lesson_id: string; completed_at: string | null }[])
      .filter((p) => p.completed_at)
      .map((p) => p.lesson_id),
  )

  const { data: outline } = await supabase.from('lesson_outline').select('id, course_id')
  const byCourse = new Map<string, string[]>()
  for (const l of (outline ?? []) as { id: string; course_id: string }[]) {
    const arr = byCourse.get(l.course_id) ?? []
    arr.push(l.id)
    byCourse.set(l.course_id, arr)
  }

  // Uma etapa está concluída quando todas as aulas do curso dela estão.
  const marcados = steps.map((s) => {
    const aulas = s.course_id ? (byCourse.get(s.course_id) ?? []) : []
    const concluida = aulas.length > 0 && aulas.every((a) => done.has(a))
    return { ...s, done: concluida, current: false }
  })

  const currentIndex = marcados.findIndex((s) => !s.done)
  if (currentIndex >= 0) marcados[currentIndex].current = true

  return {
    ...journey,
    steps: marcados,
    currentIndex: currentIndex < 0 ? marcados.length : currentIndex,
  }
}

// ---------------------------------------------------------------------
// Labs e Cases
// ---------------------------------------------------------------------

export type LabView = Lab & {
  skills: Skill[]
  submission: LabSubmission | null
}

export async function loadLabs(userId: string | null): Promise<LabView[]> {
  const [labsRes, mapRes, skillsRes, subRes] = await Promise.all([
    supabase.from('labs').select('*').eq('status', 'published').order('sort_order'),
    supabase.from('lab_skills').select('lab_id, skill_id'),
    supabase.from('skills').select('*'),
    userId
      ? supabase.from('lab_submissions').select('*').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (labsRes.error) throw new Error(labsRes.error.message)

  const skills = (skillsRes.data ?? []) as Skill[]
  const map = (mapRes.data ?? []) as { lab_id: string; skill_id: string }[]
  const subs = (subRes.data ?? []) as LabSubmission[]

  return ((labsRes.data ?? []) as Lab[]).map((lab) => ({
    ...lab,
    skills: map
      .filter((m) => m.lab_id === lab.id)
      .map((m) => skills.find((s) => s.id === m.skill_id))
      .filter(Boolean) as Skill[],
    submission: subs.find((s) => s.lab_id === lab.id) ?? null,
  }))
}

export async function saveLabSubmission(
  userId: string,
  labId: string,
  content: string,
  concluir: boolean,
): Promise<LabSubmission> {
  const { data, error } = await supabase
    .from('lab_submissions')
    .upsert(
      {
        user_id: userId,
        lab_id: labId,
        content,
        completed_at: concluir ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,lab_id' },
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as LabSubmission
}

// ---------------------------------------------------------------------
// Quiz e anotações da aula
// ---------------------------------------------------------------------

export async function loadQuiz(lessonId: string): Promise<LessonQuiz[]> {
  const { data } = await supabase
    .from('lesson_quizzes')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('sort_order')
  return (data ?? []) as LessonQuiz[]
}

export async function loadNote(userId: string, lessonId: string): Promise<string> {
  const { data } = await supabase
    .from('lesson_notes')
    .select('content')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()
  return (data?.content as string) ?? ''
}

export async function saveNote(
  userId: string,
  lessonId: string,
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from('lesson_notes')
    .upsert({ user_id: userId, lesson_id: lessonId, content }, { onConflict: 'user_id,lesson_id' })
  if (error) console.warn('anotação não salva', error.message)
}

// ---------------------------------------------------------------------
// Salvar para depois
// ---------------------------------------------------------------------

export async function loadBookmarks(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('bookmarks').select('course_id').eq('user_id', userId)
  return new Set(((data ?? []) as { course_id: string }[]).map((b) => b.course_id))
}

export async function toggleBookmark(
  userId: string,
  courseId: string,
  salvar: boolean,
): Promise<void> {
  if (salvar) {
    await supabase.from('bookmarks').upsert({ user_id: userId, course_id: courseId })
  } else {
    await supabase.from('bookmarks').delete().eq('user_id', userId).eq('course_id', courseId)
  }
}

/** Anotação com o contexto da aula, para a aba "Minhas anotações" da Jornada. */
export type NoteView = {
  lesson_id: string
  lesson_title: string
  course_title: string
  content: string
  updated_at: string
}

export async function loadNotes(userId: string): Promise<NoteView[]> {
  const { data, error } = await supabase
    .from('lesson_notes')
    .select('lesson_id, content, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as { lesson_id: string; content: string; updated_at: string }[]
  const comTexto = rows.filter((r) => r.content.trim() !== '')
  if (comTexto.length === 0) return []

  const [outlineRes, coursesRes] = await Promise.all([
    supabase
      .from('lesson_outline')
      .select('id, title, course_id')
      .in('id', comTexto.map((r) => r.lesson_id)),
    supabase.from('courses').select('id, title'),
  ])

  const aulas = new Map(
    ((outlineRes.data ?? []) as { id: string; title: string; course_id: string }[]).map((l) => [
      l.id,
      l,
    ]),
  )
  const cursos = new Map(
    ((coursesRes.data ?? []) as { id: string; title: string }[]).map((c) => [c.id, c.title]),
  )

  return comTexto.flatMap((r) => {
    const aula = aulas.get(r.lesson_id)
    if (!aula) return [] // aula despublicada: a anotação fica guardada, mas não aparece
    return [
      {
        lesson_id: r.lesson_id,
        lesson_title: aula.title,
        course_title: cursos.get(aula.course_id) ?? 'Kalidash Academy',
        content: r.content,
        updated_at: r.updated_at,
      },
    ]
  })
}
