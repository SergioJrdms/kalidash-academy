import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminGetLesson, adminUpdateLesson } from '../services/admin'
import { supabase } from '../lib/supabase'
import { renderMarkdown } from '../lib/markdown'
import type { Lesson } from '../types/db'
import {
  Banner,
  Field,
  GhostButton,
  inputStyle,
  PageLoading,
  PrimaryButton,
} from '../components/ui'
import VideoUploader from './VideoUploader'
import MaterialUploader from './MaterialUploader'

const selectStyle = { ...inputStyle, cursor: 'pointer' }

export default function AdminLessonEdit() {
  const { lessonId } = useParams<{ lessonId: string }>()

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseTitle, setCourseTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    if (!lessonId) return
    let active = true
    setLoading(true)

    adminGetLesson(lessonId)
      .then(async (l) => {
        if (!active) return
        setLesson(l)
        const { data } = await supabase
          .from('course_modules')
          .select('course_id, courses(id, title)')
          .eq('id', l.module_id)
          .single()
        if (!active || !data) return
        setCourseId(data.course_id as string)
        // deno-lint-ignore no-explicit-any
        setCourseTitle(((data as any).courses?.title as string) ?? '')
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar a aula.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [lessonId])

  function patch(p: Partial<Lesson>) {
    setLesson((l) => (l ? { ...l, ...p } : l))
    setSaved(false)
  }

  async function save() {
    if (!lesson) return
    setSaving(true)
    setError(null)
    try {
      const updated = await adminUpdateLesson(lesson.id, {
        title: lesson.title,
        summary: lesson.summary,
        body_markdown: lesson.body_markdown,
        sort_order: lesson.sort_order,
        access_type: lesson.access_type,
        status: lesson.status,
        application_title: lesson.application_title,
        application_minutes: lesson.application_minutes,
        application_steps: lesson.application_steps,
        application_note: lesson.application_note,
        published_at:
          lesson.status === 'published' && !lesson.published_at
            ? new Date().toISOString()
            : lesson.published_at,
      })
      setLesson(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoading />
  if (!lesson) return <Banner kind="error">{error ?? 'Aula não encontrada.'}</Banner>

  const steps = Array.isArray(lesson.application_steps) ? lesson.application_steps : []

  function setSteps(next: string[]) {
    patch({ application_steps: next })
  }

  return (
    <div>
      <Link
        to={courseId ? `/admin/cursos/${courseId}` : '/admin/cursos'}
        style={{
          color: 'var(--tx3)',
          fontSize: 12.5,
          fontWeight: 600,
          display: 'inline-block',
          marginBottom: 20,
        }}
      >
        ← {courseTitle || 'Curso'}
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 26,
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            fontFamily: 'Raleway,sans-serif',
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: '-.02em',
            margin: 0,
          }}
        >
          {lesson.title}
        </h1>
        <div style={{ flex: 1 }} />
        {saved && <span style={{ fontSize: 12.5, color: 'var(--ok)' }}>Salvo</span>}
        <PrimaryButton onClick={() => void save()} disabled={saving} style={{ padding: '12px 26px' }}>
          {saving ? 'Salvando...' : 'Salvar aula'}
        </PrimaryButton>
      </div>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* ---------- básico ---------- */}
        <section
          style={{
            background: 'var(--sf)',
            border: '1px solid var(--line)',
            borderRadius: 20,
            padding: 22,
            display: 'grid',
            gap: 18,
            gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
          }}
        >
          <Field label="Título" style={{ gridColumn: '1 / -1' }}>
            <input
              value={lesson.title}
              onChange={(e) => patch({ title: e.target.value })}
              style={inputStyle}
            />
          </Field>

          <Field label="Resumo" style={{ gridColumn: '1 / -1' }} hint="Aparece abaixo do vídeo, na página da aula.">
            <textarea
              value={lesson.summary ?? ''}
              onChange={(e) => patch({ summary: e.target.value })}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </Field>

          <Field label="Ordem no módulo">
            <input
              type="number"
              value={lesson.sort_order}
              onChange={(e) => patch({ sort_order: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>

          <Field label="Tipo de acesso">
            <select
              value={lesson.access_type}
              onChange={(e) => patch({ access_type: e.target.value as Lesson['access_type'] })}
              style={selectStyle}
            >
              <option value="inherit">Herdar do curso</option>
              <option value="free">Gratuita</option>
              <option value="paid">Paga</option>
            </select>
          </Field>

          <Field label="Status">
            <select
              value={lesson.status}
              onChange={(e) => patch({ status: e.target.value as Lesson['status'] })}
              style={selectStyle}
            >
              <option value="draft">Rascunho</option>
              <option value="published">Publicada</option>
            </select>
          </Field>
        </section>

        {/* ---------- vídeo ---------- */}
        <VideoUploader lesson={lesson} onChange={setLesson} />

        {/* ---------- conteúdo textual ---------- */}
        <section
          style={{
            background: 'var(--sf)',
            border: '1px solid var(--line)',
            borderRadius: 20,
            padding: 22,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'var(--tx3)',
              }}
            >
              Conteúdo textual (Markdown)
            </div>
            <div style={{ flex: 1 }} />
            <GhostButton onClick={() => setPreview((v) => !v)} style={{ padding: '8px 16px' }}>
              {preview ? 'Editar' : 'Pré-visualizar'}
            </GhostButton>
          </div>

          {preview ? (
            <div
              className="k-md"
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--line)',
                borderRadius: 14,
                padding: 20,
                minHeight: 220,
                maxWidth: 'none',
              }}
              dangerouslySetInnerHTML={{
                __html:
                  renderMarkdown(lesson.body_markdown) ||
                  '<p style="color:var(--tx3)">Nada escrito ainda.</p>',
              }}
            />
          ) : (
            <textarea
              value={lesson.body_markdown ?? ''}
              onChange={(e) => patch({ body_markdown: e.target.value })}
              rows={14}
              placeholder={'## Um subtítulo\n\nO texto da aula em Markdown. Opcional: a aula pode ter só vídeo, só texto, ou os dois.'}
              style={{
                ...inputStyle,
                resize: 'vertical',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 13,
                lineHeight: 1.65,
              }}
            />
          )}
        </section>

        {/* ---------- aplicação prática ---------- */}
        <section
          style={{
            background: 'var(--sf)',
            border: '1px solid var(--pline)',
            borderRadius: 20,
            padding: 22,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: 'var(--p2)',
              marginBottom: 16,
            }}
          >
            Aplique no seu trabalho
          </div>

          <div
            style={{
              display: 'grid',
              gap: 18,
              gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
              marginBottom: 20,
            }}
          >
            <Field
              label="Título da aplicação"
              style={{ gridColumn: '1 / -1' }}
              hint="Deixe vazio para a aula não exibir o bloco de aplicação."
            >
              <input
                value={lesson.application_title ?? ''}
                onChange={(e) => patch({ application_title: e.target.value })}
                placeholder="Ex.: Faça uma leitura honesta da sua última semana."
                style={inputStyle}
              />
            </Field>

            <Field label="Minutos estimados">
              <input
                type="number"
                value={lesson.application_minutes ?? ''}
                onChange={(e) =>
                  patch({
                    application_minutes: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </Field>
          </div>

          <div
            style={{
              fontSize: 11,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: 'var(--tx3)',
              marginBottom: 10,
            }}
          >
            Passos
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span
                  style={{
                    flex: 'none',
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: 'var(--sf2)',
                    border: '1px solid var(--pline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--p2)',
                  }}
                >
                  {i + 1}
                </span>
                <input
                  value={step}
                  onChange={(e) => {
                    const next = [...steps]
                    next[i] = e.target.value
                    setSteps(next)
                  }}
                  style={inputStyle}
                />
                <button
                  onClick={() => {
                    if (i === 0) return
                    const next = [...steps]
                    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                    setSteps(next)
                  }}
                  disabled={i === 0}
                  title="Subir"
                  style={miniBtn}
                >
                  ↑
                </button>
                <button
                  onClick={() => {
                    if (i === steps.length - 1) return
                    const next = [...steps]
                    ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
                    setSteps(next)
                  }}
                  disabled={i === steps.length - 1}
                  title="Descer"
                  style={miniBtn}
                >
                  ↓
                </button>
                <button
                  onClick={() => setSteps(steps.filter((_, k) => k !== i))}
                  title="Remover"
                  style={{ ...miniBtn, color: 'var(--danger)' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <GhostButton onClick={() => setSteps([...steps, ''])} style={{ padding: '10px 20px' }}>
            + Adicionar passo
          </GhostButton>

          <div style={{ marginTop: 20 }}>
            <Field label="Nota final" hint="Aparece ao lado do botão 'Marcar como aplicado'.">
              <input
                value={lesson.application_note ?? ''}
                onChange={(e) => patch({ application_note: e.target.value })}
                placeholder="Ex.: Guarde essa resposta. Ela é o ponto de partida das próximas aulas."
                style={inputStyle}
              />
            </Field>
          </div>
        </section>

        {/* ---------- materiais ---------- */}
        <MaterialUploader lessonId={lesson.id} />
      </div>

      <div style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <PrimaryButton onClick={() => void save()} disabled={saving} style={{ padding: '13px 30px' }}>
          {saving ? 'Salvando...' : 'Salvar aula'}
        </PrimaryButton>
        <Link
          to={`/aula/${lesson.id}`}
          target="_blank"
          style={{
            border: '1px solid var(--line2)',
            borderRadius: 999,
            padding: '13px 24px',
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--tx)',
          }}
        >
          Ver como aluno
        </Link>
      </div>
    </div>
  )
}

const miniBtn: React.CSSProperties = {
  flex: 'none',
  width: 30,
  height: 30,
  borderRadius: 9,
  background: 'var(--sf2)',
  border: '1px solid var(--line)',
  color: 'var(--tx2)',
  fontSize: 14,
  cursor: 'pointer',
}
