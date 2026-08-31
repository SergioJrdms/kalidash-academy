import { supabase } from '../lib/supabase'
import type {
  AcademyEvent,
  Course,
  CourseModule,
  Lesson,
  LessonMaterial,
  Profile,
} from '../types/db'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// ---------------------------------------------------------------------
// Cursos
// ---------------------------------------------------------------------
export async function adminListCourses(): Promise<Course[]> {
  return unwrap(
    await supabase.from('courses').select('*').order('sort_order', { ascending: true }),
  )
}

export async function adminGetCourse(id: string): Promise<Course> {
  return unwrap(await supabase.from('courses').select('*').eq('id', id).single())
}

export async function adminCreateCourse(patch: Partial<Course>): Promise<Course> {
  return unwrap(await supabase.from('courses').insert(patch).select('*').single())
}

export async function adminUpdateCourse(
  id: string,
  patch: Partial<Course>,
): Promise<Course> {
  return unwrap(await supabase.from('courses').update(patch).eq('id', id).select('*').single())
}

export async function adminDeleteCourse(id: string): Promise<void> {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------
// Módulos
// ---------------------------------------------------------------------
export async function adminListModules(courseId: string): Promise<CourseModule[]> {
  return unwrap(
    await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true }),
  )
}

export async function adminCreateModule(
  patch: Partial<CourseModule>,
): Promise<CourseModule> {
  return unwrap(await supabase.from('course_modules').insert(patch).select('*').single())
}

export async function adminUpdateModule(
  id: string,
  patch: Partial<CourseModule>,
): Promise<CourseModule> {
  return unwrap(
    await supabase.from('course_modules').update(patch).eq('id', id).select('*').single(),
  )
}

export async function adminDeleteModule(id: string): Promise<void> {
  const { error } = await supabase.from('course_modules').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------
// Aulas
// ---------------------------------------------------------------------
export async function adminListLessons(moduleIds: string[]): Promise<Lesson[]> {
  if (moduleIds.length === 0) return []
  return unwrap(
    await supabase
      .from('lessons')
      .select('*')
      .in('module_id', moduleIds)
      .order('sort_order', { ascending: true }),
  )
}

export async function adminGetLesson(id: string): Promise<Lesson> {
  return unwrap(await supabase.from('lessons').select('*').eq('id', id).single())
}

export async function adminCreateLesson(patch: Partial<Lesson>): Promise<Lesson> {
  return unwrap(await supabase.from('lessons').insert(patch).select('*').single())
}

export async function adminUpdateLesson(
  id: string,
  patch: Partial<Lesson>,
): Promise<Lesson> {
  return unwrap(await supabase.from('lessons').update(patch).eq('id', id).select('*').single())
}

export async function adminDeleteLesson(id: string): Promise<void> {
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------
// Materiais
// ---------------------------------------------------------------------
export async function adminListMaterials(lessonId: string): Promise<LessonMaterial[]> {
  return unwrap(
    await supabase
      .from('lesson_materials')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('sort_order', { ascending: true }),
  )
}

export async function adminCreateMaterial(
  patch: Partial<LessonMaterial>,
): Promise<LessonMaterial> {
  return unwrap(await supabase.from('lesson_materials').insert(patch).select('*').single())
}

export async function adminDeleteMaterial(id: string): Promise<void> {
  const { error } = await supabase.from('lesson_materials').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------
export async function adminListEvents(): Promise<AcademyEvent[]> {
  return unwrap(
    await supabase.from('events').select('*').order('starts_at', { ascending: false }),
  )
}

export async function adminCreateEvent(patch: Partial<AcademyEvent>): Promise<AcademyEvent> {
  return unwrap(await supabase.from('events').insert(patch).select('*').single())
}

export async function adminUpdateEvent(
  id: string,
  patch: Partial<AcademyEvent>,
): Promise<AcademyEvent> {
  return unwrap(await supabase.from('events').update(patch).eq('id', id).select('*').single())
}

export async function adminDeleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------
// Usuários — a policy profiles_update_admin permite ao admin mudar
// role/access_level; o trigger bloqueia qualquer outro.
// ---------------------------------------------------------------------
export async function adminListUsers(): Promise<Profile[]> {
  return unwrap(
    await supabase.from('profiles').select('*').order('created_at', { ascending: false }),
  )
}

export async function adminSetAccessLevel(
  userId: string,
  accessLevel: 'free' | 'paid',
): Promise<Profile> {
  return unwrap(
    await supabase
      .from('profiles')
      .update({ access_level: accessLevel })
      .eq('id', userId)
      .select('*')
      .single(),
  )
}

export async function adminSetRole(
  userId: string,
  role: 'student' | 'admin',
): Promise<Profile> {
  return unwrap(
    await supabase.from('profiles').update({ role }).eq('id', userId).select('*').single(),
  )
}
