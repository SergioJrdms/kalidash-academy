export type UserRole = 'student' | 'admin'
export type AccessLevel = 'free' | 'paid'
export type CourseAccess = 'free' | 'paid'
export type CourseStatus = 'draft' | 'published' | 'coming_soon'
export type LessonAccess = 'inherit' | 'free' | 'paid'
export type LessonStatus = 'draft' | 'published'
export type VideoStatus = 'empty' | 'uploading' | 'processing' | 'ready' | 'error'
export type EventStatus = 'draft' | 'published'

export const AREAS = [
  'Gestão',
  'Financeiro',
  'RH',
  'Marketing',
  'Comercial',
  'Operações',
] as const

export const GOALS = [
  'Reduzir trabalho manual',
  'Automatizar processos',
  'Usar IA melhor',
  'Melhorar decisões',
  'Desenvolver minha equipe',
] as const

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  company: string | null
  area: string | null
  goal: string | null
  role: UserRole
  access_level: AccessLevel
  created_at: string
  updated_at: string
}

export type Course = {
  id: string
  title: string
  slug: string
  short_description: string | null
  description: string | null
  area: string
  access_type: CourseAccess
  status: CourseStatus
  thumbnail_url: string | null
  instructor_name: string | null
  instructor_avatar_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
  published_at: string | null
}

export type CourseModule = {
  id: string
  course_id: string
  title: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type Lesson = {
  id: string
  module_id: string
  title: string
  summary: string | null
  body_markdown: string | null
  sort_order: number
  access_type: LessonAccess
  status: LessonStatus
  duration_seconds: number | null
  mux_upload_id: string | null
  mux_asset_id: string | null
  mux_playback_id: string | null
  video_status: VideoStatus
  application_title: string | null
  application_minutes: number | null
  application_steps: string[]
  application_note: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

/** View lesson_outline: a estrutura visível mesmo sem acesso ao conteúdo. */
export type LessonOutline = {
  id: string
  module_id: string
  course_id: string
  title: string
  summary: string | null
  sort_order: number
  status: LessonStatus
  duration_seconds: number | null
  has_video: boolean
  effective_access: CourseAccess
}

export type LessonMaterial = {
  id: string
  lesson_id: string
  title: string
  description: string | null
  storage_path: string
  file_name: string
  mime_type: string | null
  file_size: number | null
  sort_order: number
  created_at: string
}

/** View material_outline: nome e tamanho, sem o caminho no Storage. */
export type MaterialOutline = Omit<LessonMaterial, 'storage_path' | 'created_at'>

export type LessonProgress = {
  id: string
  user_id: string
  lesson_id: string
  watched_seconds: number
  completed_at: string | null
  applied_at: string | null
  updated_at: string
}

export type AcademyEvent = {
  id: string
  title: string
  description: string | null
  starts_at: string
  format: string | null
  instructor_name: string | null
  access_type: CourseAccess
  external_url: string | null
  recording_url: string | null
  thumbnail_url: string | null
  status: EventStatus
  created_at: string
  updated_at: string
}
