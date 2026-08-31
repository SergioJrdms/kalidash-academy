import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  adminCreateCourse,
  adminDeleteCourse,
  adminListCourses,
  adminUpdateCourse,
} from '../services/admin'
import { slugify } from '../lib/format'
import type { Course } from '../types/db'
import { Banner, ErrorState, GhostButton, PrimaryButton, Skeleton, Spinner } from '../components/ui'

const STATUS_LABEL: Record<Course['status'], string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  coming_soon: 'Em breve',
}

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setCourses(await adminListCourses())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cursos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function createCourse() {
    setCreating(true)
    setError(null)
    try {
      const n = courses.length + 1
      const title = `Novo conteúdo ${n}`
      const course = await adminCreateCourse({
        title,
        slug: `${slugify(title)}-${Date.now().toString(36)}`,
        area: 'Gestão',
        access_type: 'paid',
        status: 'draft',
        instructor_name: 'Time Kalidash',
        sort_order: n,
      })
      navigate(`/admin/cursos/${course.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar o curso.')
    } finally {
      setCreating(false)
    }
  }

  async function togglePublish(course: Course) {
    setBusyId(course.id)
    setError(null)
    try {
      const next: Course['status'] = course.status === 'published' ? 'draft' : 'published'
      const updated = await adminUpdateCourse(course.id, {
        status: next,
        published_at: next === 'published' ? new Date().toISOString() : course.published_at,
      })
      setCourses((list) => list.map((c) => (c.id === course.id ? updated : c)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar.')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(course: Course) {
    if (
      !window.confirm(
        `Excluir "${course.title}"?\n\nIsso apaga os módulos, as aulas e os materiais deste curso. A ação não pode ser desfeita.`,
      )
    )
      return

    setBusyId(course.id)
    setError(null)
    try {
      await adminDeleteCourse(course.id)
      setCourses((list) => list.filter((c) => c.id !== course.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 28,
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            fontFamily: 'Raleway,sans-serif',
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '-.02em',
            margin: 0,
          }}
        >
          Conteúdos
        </h1>
        <div style={{ flex: 1 }} />
        <PrimaryButton onClick={() => void createCourse()} disabled={creating}>
          {creating ? 'Criando...' : 'Novo curso'}
        </PrimaryButton>
      </div>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton height={92} radius={18} />
          <Skeleton height={92} radius={18} />
          <Skeleton height={92} radius={18} />
        </div>
      ) : courses.length === 0 ? (
        <ErrorState
          title="Nenhum curso ainda"
          message="Crie o primeiro conteúdo do Academy."
          onRetry={() => void createCourse()}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {courses.map((c) => (
            <div
              key={c.id}
              className="k-stack-mobile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                background: 'var(--sf)',
                border: '1px solid var(--line)',
                borderRadius: 18,
                padding: 16,
              }}
            >
              <div
                style={{
                  flex: 'none',
                  width: 92,
                  height: 62,
                  borderRadius: 12,
                  border: '1px solid var(--line)',
                  background: c.thumbnail_url
                    ? `center/cover no-repeat url(${JSON.stringify(c.thumbnail_url)})`
                    : 'linear-gradient(135deg,var(--psoft),var(--bg2))',
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{c.title}</div>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    fontSize: 11.5,
                    color: 'var(--tx3)',
                  }}
                >
                  <span>{c.area}</span>
                  <span>·</span>
                  <span>{c.access_type === 'free' ? 'Gratuito' : 'Pago'}</span>
                  <span>·</span>
                  <span
                    style={{
                      color:
                        c.status === 'published'
                          ? 'var(--ok)'
                          : c.status === 'coming_soon'
                            ? 'var(--p2)'
                            : 'var(--tx3)',
                      fontWeight: 600,
                    }}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                  <span>·</span>
                  <span>/{c.slug}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {busyId === c.id && <Spinner size={14} />}
                <Link
                  to={`/admin/cursos/${c.id}`}
                  style={{
                    border: '1px solid var(--line2)',
                    borderRadius: 999,
                    padding: '9px 18px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--tx)',
                  }}
                >
                  Editar
                </Link>
                <GhostButton
                  onClick={() => void togglePublish(c)}
                  disabled={busyId === c.id}
                  style={{ padding: '9px 18px' }}
                >
                  {c.status === 'published' ? 'Despublicar' : 'Publicar'}
                </GhostButton>
                <button
                  onClick={() => void remove(c)}
                  disabled={busyId === c.id}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    color: 'var(--danger)',
                    borderRadius: 999,
                    padding: '9px 16px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
