import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  adminCreateLesson,
  adminCreateModule,
  adminDeleteLesson,
  adminDeleteModule,
  adminGetCourse,
  adminListLessons,
  adminListModules,
  adminUpdateCourse,
  adminUpdateModule,
} from '../services/admin'
import { removePublicImage, uploadPublicImage } from '../services/media'
import { formatDuration, slugify } from '../lib/format'
import { AREAS, type Course, type CourseModule, type Lesson } from '../types/db'
import {
  Banner,
  Field,
  GhostButton,
  inputStyle,
  PageLoading,
  PrimaryButton,
  Spinner,
} from '../components/ui'

const selectStyle = { ...inputStyle, cursor: 'pointer' }

export default function AdminCourseEdit() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()

  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<CourseModule[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function loadAll() {
    if (!courseId) return
    setLoading(true)
    setError(null)
    try {
      const c = await adminGetCourse(courseId)
      const mods = await adminListModules(courseId)
      const ls = await adminListLessons(mods.map((m) => m.id))
      setCourse(c)
      setModules(mods)
      setLessons(ls)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o curso.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [courseId])

  function patch(p: Partial<Course>) {
    setCourse((c) => (c ? { ...c, ...p } : c))
    setSaved(false)
  }

  async function save() {
    if (!course) return
    setSaving(true)
    setError(null)
    try {
      const updated = await adminUpdateCourse(course.id, {
        title: course.title,
        slug: course.slug || slugify(course.title),
        short_description: course.short_description,
        description: course.description,
        area: course.area,
        access_type: course.access_type,
        status: course.status,
        thumbnail_url: course.thumbnail_url,
        instructor_name: course.instructor_name,
        instructor_avatar_url: course.instructor_avatar_url,
        sort_order: course.sort_order,
        published_at:
          course.status === 'published' && !course.published_at
            ? new Date().toISOString()
            : course.published_at,
      })
      setCourse(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function onThumb(file: File | undefined) {
    if (!file || !course) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadPublicImage(file, `thumbnails/${course.id}`)
      const updated = await adminUpdateCourse(course.id, { thumbnail_url: url })
      setCourse(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar a imagem.')
    } finally {
      setUploading(false)
    }
  }

  async function clearThumb() {
    if (!course?.thumbnail_url) return
    setUploading(true)
    try {
      await removePublicImage(course.thumbnail_url)
      const updated = await adminUpdateCourse(course.id, { thumbnail_url: null })
      setCourse(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover a imagem.')
    } finally {
      setUploading(false)
    }
  }

  // ---------------- módulos ----------------
  async function addModule() {
    if (!course) return
    setBusy('module')
    try {
      const mod = await adminCreateModule({
        course_id: course.id,
        title: `Módulo ${modules.length + 1}`,
        sort_order: modules.length + 1,
      })
      setModules((m) => [...m, mod])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar o módulo.')
    } finally {
      setBusy(null)
    }
  }

  async function saveModule(mod: CourseModule) {
    setBusy(mod.id)
    try {
      const updated = await adminUpdateModule(mod.id, {
        title: mod.title,
        description: mod.description,
        sort_order: mod.sort_order,
      })
      setModules((list) =>
        list
          .map((m) => (m.id === mod.id ? updated : m))
          .sort((a, z) => a.sort_order - z.sort_order),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar o módulo.')
    } finally {
      setBusy(null)
    }
  }

  async function removeModule(mod: CourseModule) {
    const count = lessons.filter((l) => l.module_id === mod.id).length
    if (
      !window.confirm(
        `Excluir o módulo "${mod.title}"?${count > 0 ? `\n\nIsso apaga ${count} aula(s) dentro dele.` : ''}\n\nA ação não pode ser desfeita.`,
      )
    )
      return
    setBusy(mod.id)
    try {
      await adminDeleteModule(mod.id)
      setModules((list) => list.filter((m) => m.id !== mod.id))
      setLessons((list) => list.filter((l) => l.module_id !== mod.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir o módulo.')
    } finally {
      setBusy(null)
    }
  }

  // ---------------- aulas ----------------
  async function addLesson(mod: CourseModule) {
    setBusy(mod.id)
    try {
      const count = lessons.filter((l) => l.module_id === mod.id).length
      const lesson = await adminCreateLesson({
        module_id: mod.id,
        title: `Nova aula ${count + 1}`,
        sort_order: count + 1,
        access_type: 'inherit',
        status: 'draft',
      })
      setLessons((l) => [...l, lesson])
      navigate(`/admin/aulas/${lesson.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar a aula.')
    } finally {
      setBusy(null)
    }
  }

  async function removeLesson(lesson: Lesson) {
    if (
      !window.confirm(
        `Excluir a aula "${lesson.title}"?\n\n${lesson.mux_asset_id ? 'ATENÇÃO: o vídeo continuará ocupando espaço no Mux. Remova o vídeo pela tela da aula antes de excluir.\n\n' : ''}A ação não pode ser desfeita.`,
      )
    )
      return
    setBusy(lesson.id)
    try {
      await adminDeleteLesson(lesson.id)
      setLessons((list) => list.filter((l) => l.id !== lesson.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir a aula.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <PageLoading />
  if (!course) {
    return (
      <Banner kind="error">{error ?? 'Curso não encontrado.'}</Banner>
    )
  }

  return (
    <div>
      <Link
        to="/admin/cursos"
        style={{ color: 'var(--tx3)', fontSize: 12.5, fontWeight: 600, display: 'inline-block', marginBottom: 20 }}
      >
        ← Conteúdos
      </Link>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 26, flexWrap: 'wrap' }}
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
          {course.title}
        </h1>
        <div style={{ flex: 1 }} />
        {saved && <span style={{ fontSize: 12.5, color: 'var(--ok)' }}>Salvo</span>}
        <PrimaryButton onClick={() => void save()} disabled={saving} style={{ padding: '12px 26px' }}>
          {saving ? 'Salvando...' : 'Salvar curso'}
        </PrimaryButton>
      </div>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      {/* ---------------- dados do curso ---------------- */}
      <section
        style={{
          background: 'var(--sf)',
          border: '1px solid var(--line)',
          borderRadius: 20,
          padding: 24,
          marginBottom: 30,
          display: 'grid',
          gap: 18,
          gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
        }}
      >
        <Field label="Título" style={{ gridColumn: '1 / -1' }}>
          <input
            value={course.title}
            onChange={(e) => patch({ title: e.target.value })}
            style={inputStyle}
          />
        </Field>

        <Field label="Slug" hint="Endereço público: /conteudos/slug">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={course.slug}
              onChange={(e) => patch({ slug: e.target.value })}
              style={inputStyle}
            />
            <GhostButton
              onClick={() => patch({ slug: slugify(course.title) })}
              style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}
            >
              Gerar
            </GhostButton>
          </div>
        </Field>

        <Field label="Ordem na vitrine">
          <input
            type="number"
            value={course.sort_order}
            onChange={(e) => patch({ sort_order: Number(e.target.value) })}
            style={inputStyle}
          />
        </Field>

        <Field label="Descrição curta" style={{ gridColumn: '1 / -1' }}>
          <input
            value={course.short_description ?? ''}
            onChange={(e) => patch({ short_description: e.target.value })}
            style={inputStyle}
          />
        </Field>

        <Field label="Descrição" style={{ gridColumn: '1 / -1' }}>
          <textarea
            value={course.description ?? ''}
            onChange={(e) => patch({ description: e.target.value })}
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
        </Field>

        <Field label="Área">
          <select
            value={course.area}
            onChange={(e) => patch({ area: e.target.value })}
            style={selectStyle}
          >
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Acesso" hint="Aulas com 'herdar' seguem esta escolha.">
          <select
            value={course.access_type}
            onChange={(e) => patch({ access_type: e.target.value as Course['access_type'] })}
            style={selectStyle}
          >
            <option value="free">Gratuito</option>
            <option value="paid">Pago</option>
          </select>
        </Field>

        <Field label="Status">
          <select
            value={course.status}
            onChange={(e) => patch({ status: e.target.value as Course['status'] })}
            style={selectStyle}
          >
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="coming_soon">Em breve</option>
          </select>
        </Field>

        <Field label="Professor">
          <input
            value={course.instructor_name ?? ''}
            onChange={(e) => patch({ instructor_name: e.target.value })}
            style={inputStyle}
          />
        </Field>

        <Field label="Thumbnail" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div
              style={{
                width: 132,
                height: 88,
                borderRadius: 12,
                border: '1px solid var(--line)',
                background: course.thumbnail_url
                  ? `center/cover no-repeat url(${JSON.stringify(course.thumbnail_url)})`
                  : 'linear-gradient(135deg,var(--psoft),var(--bg2))',
                flex: 'none',
              }}
            />
            <label
              style={{
                border: '1px solid var(--line2)',
                borderRadius: 999,
                padding: '10px 20px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
              }}
            >
              {uploading && <Spinner size={13} />}
              {course.thumbnail_url ? 'Substituir' : 'Enviar imagem'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void onThumb(e.target.files?.[0])}
              />
            </label>
            {course.thumbnail_url && (
              <button
                onClick={() => void clearThumb()}
                disabled={uploading}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  color: 'var(--danger)',
                  borderRadius: 999,
                  padding: '10px 18px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Remover
              </button>
            )}
          </div>
        </Field>
      </section>

      {/* ---------------- construtor ---------------- */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}
      >
        <h2
          style={{
            fontFamily: 'Raleway,sans-serif',
            fontWeight: 700,
            fontSize: 19,
            margin: 0,
          }}
        >
          Módulos e aulas
        </h2>
        <div style={{ flex: 1 }} />
        <GhostButton onClick={() => void addModule()} disabled={busy === 'module'}>
          Novo módulo
        </GhostButton>
      </div>

      {modules.length === 0 && (
        <Banner kind="info">
          Este curso ainda não tem módulos. Crie o primeiro para começar a adicionar aulas.
        </Banner>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {modules.map((mod) => {
          const mLessons = lessons
            .filter((l) => l.module_id === mod.id)
            .sort((a, z) => a.sort_order - z.sort_order)

          return (
            <section
              key={mod.id}
              style={{
                background: 'var(--sf)',
                border: '1px solid var(--line)',
                borderRadius: 20,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-end',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                }}
              >
                <Field label="Módulo" style={{ flex: 1, minWidth: 220 }}>
                  <input
                    value={mod.title}
                    onChange={(e) =>
                      setModules((list) =>
                        list.map((m) => (m.id === mod.id ? { ...m, title: e.target.value } : m)),
                      )
                    }
                    onBlur={() => void saveModule(mod)}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Ordem" style={{ width: 100 }}>
                  <input
                    type="number"
                    value={mod.sort_order}
                    onChange={(e) =>
                      setModules((list) =>
                        list.map((m) =>
                          m.id === mod.id ? { ...m, sort_order: Number(e.target.value) } : m,
                        ),
                      )
                    }
                    onBlur={() => void saveModule(mod)}
                    style={inputStyle}
                  />
                </Field>
                {busy === mod.id && <Spinner size={15} />}
                <button
                  onClick={() => void removeModule(mod)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    color: 'var(--danger)',
                    borderRadius: 999,
                    padding: '11px 18px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Excluir módulo
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mLessons.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      background: 'var(--bg2)',
                      border: '1px solid var(--line)',
                      borderRadius: 14,
                      padding: '12px 16px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Raleway,sans-serif',
                        fontWeight: 700,
                        fontSize: 12,
                        color: 'var(--p2)',
                        width: 24,
                      }}
                    >
                      {String(l.sort_order).padStart(2, '0')}
                    </span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, minWidth: 140 }}>
                      {l.title}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>
                      {formatDuration(l.duration_seconds) || 'sem vídeo'}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '.06em',
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: l.status === 'published' ? 'var(--oksoft)' : 'var(--sf2)',
                        color: l.status === 'published' ? 'var(--ok)' : 'var(--tx3)',
                        border: '1px solid var(--line)',
                      }}
                    >
                      {l.status === 'published' ? 'PUBLICADA' : 'RASCUNHO'}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '.06em',
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: 'var(--sf2)',
                        color: 'var(--tx3)',
                        border: '1px solid var(--line)',
                      }}
                    >
                      {l.access_type === 'inherit'
                        ? 'HERDA'
                        : l.access_type === 'free'
                          ? 'GRATUITA'
                          : 'PAGA'}
                    </span>
                    <Link
                      to={`/admin/aulas/${l.id}`}
                      style={{
                        border: '1px solid var(--line2)',
                        borderRadius: 999,
                        padding: '7px 16px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--tx)',
                      }}
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => void removeLesson(l)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--danger)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => void addLesson(mod)}
                  disabled={busy === mod.id}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--line2)',
                    color: 'var(--tx2)',
                    borderRadius: 14,
                    padding: '12px 0',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Nova aula
                </button>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
