export type UserRole = 'student' | 'admin'
export type AccessLevel = 'free' | 'paid'
export type CourseAccess = 'free' | 'paid'
export type CourseStatus = 'draft' | 'published' | 'coming_soon'
export type LessonAccess = 'inherit' | 'free' | 'paid'
export type LessonStatus = 'draft' | 'published'
export type VideoStatus = 'empty' | 'uploading' | 'processing' | 'ready' | 'error'
export type EventStatus = 'draft' | 'published'

export const AREAS = [
  'Liderança',
  'Operações',
  'Tecnologia',
  'Financeiro',
  'RH',
  'Comercial',
  'Marketing',
  'Jurídico',
] as const

export const GOALS = [
  { value: 'Reduzir trabalho manual', hint: 'Tirar da mão o que se repete', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2' },
  { value: 'Automatizar processos', hint: 'Fluxos que rodam sozinhos', icon: 'M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6z' },
  { value: 'Usar IA melhor', hint: 'Mais proveito das ferramentas', icon: 'M12 3l1.8 5 5 1.8-5 1.8L12 16.6l-1.8-5-5-1.8 5-1.8z' },
  { value: 'Melhorar decisões', hint: 'Dado no lugar de achismo', icon: 'M4 20V10M10 20V4M16 20v-6M22 20H2' },
  { value: 'Desenvolver minha equipe', hint: 'Levar o time junto', icon: 'M9 11a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4M2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5' },
] as const

export const LEVELS = [
  { value: 'Iniciante', hint: 'Estou começando agora' },
  { value: 'Intermediário', hint: 'Já uso, quero aprofundar' },
  { value: 'Avançado', hint: 'Lidero iniciativas de IA' },
] as const

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  company: string | null
  area: string | null
  goal: string | null
  level: string | null
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
  kind: ContentKind
  level: ContentLevel | null
  level_max: ContentLevel | null
  has_certificate: boolean
  outcomes: string[]
  hero_image_url: string | null
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
  transcript: string | null
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

// =====================================================================
// Produto novo do redesign
// =====================================================================

export type ContentKind = 'curso' | 'trilha'
export type ContentLevel = 'Iniciante' | 'Intermediário' | 'Avançado'
export type LabStatus = 'draft' | 'published'

export type Skill = {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
}

export type UserSkill = {
  user_id: string
  skill_id: string
  progress: number
  updated_at: string
}

export type Journey = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  area: string | null
  sort_order: number
}

export type JourneyStep = {
  id: string
  journey_id: string
  title: string
  course_id: string | null
  sort_order: number
}

export type Lab = {
  id: string
  slug: string
  title: string
  description: string | null
  body_markdown: string | null
  minutes: number | null
  level: ContentLevel | null
  image_url: string | null
  is_case: boolean
  featured: boolean
  lesson_id: string | null
  status: LabStatus
  sort_order: number
}

export type LabSubmission = {
  id: string
  user_id: string
  lab_id: string
  content: string | null
  completed_at: string | null
  updated_at: string
}

export type LessonQuiz = {
  id: string
  lesson_id: string
  question: string
  options: string[]
  correct_index: number
  explanation: string | null
  sort_order: number
}

export type LessonNote = {
  id: string
  user_id: string
  lesson_id: string
  content: string
  updated_at: string
}

export type Certificate = {
  id: string
  user_id: string
  course_id: string
  issued_at: string
  code: string
}
