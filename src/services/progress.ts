import { supabase } from '../lib/supabase'
import type { LessonProgress } from '../types/db'

/**
 * Grava progresso de vídeo. Chamada com throttle pelo player — nunca a
 * cada segundo. Falha em silêncio: perder um tick de progresso não pode
 * quebrar a aula.
 */
export async function saveWatched(
  userId: string,
  lessonId: string,
  watchedSeconds: number,
): Promise<void> {
  const { error } = await supabase.from('lesson_progress').upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      watched_seconds: Math.max(0, Math.floor(watchedSeconds)),
    },
    { onConflict: 'user_id,lesson_id' },
  )
  if (error) console.warn('progresso não salvo', error.message)
}

export async function markCompleted(
  userId: string,
  lessonId: string,
  watchedSeconds?: number,
): Promise<LessonProgress | null> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    lesson_id: lessonId,
    completed_at: new Date().toISOString(),
  }
  if (watchedSeconds != null) payload.watched_seconds = Math.floor(watchedSeconds)

  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert(payload, { onConflict: 'user_id,lesson_id' })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as LessonProgress
}

export async function unmarkCompleted(
  userId: string,
  lessonId: string,
): Promise<LessonProgress | null> {
  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert(
      { user_id: userId, lesson_id: lessonId, completed_at: null },
      { onConflict: 'user_id,lesson_id' },
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as LessonProgress
}

/** "Marcar como aplicado" — separado da conclusão da aula, de propósito. */
export async function toggleApplied(
  userId: string,
  lessonId: string,
  applied: boolean,
): Promise<LessonProgress | null> {
  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        applied_at: applied ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,lesson_id' },
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as LessonProgress
}
