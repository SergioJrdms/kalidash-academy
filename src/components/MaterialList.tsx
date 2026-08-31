import { useState } from 'react'
import { downloadMaterial } from '../services/media'
import { fileExtension, formatFileSize } from '../lib/format'
import type { MaterialOutline } from '../types/db'
import { Banner, Kicker, Spinner } from './ui'
import { track } from '../lib/analytics'

/** "Leve com você" — a lista de materiais da aula. */
export default function MaterialList({
  materials,
  unlocked,
  onLockedClick,
  courseId,
}: {
  materials: MaterialOutline[]
  unlocked: boolean
  onLockedClick: () => void
  courseId?: string | null
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (materials.length === 0) return null

  async function handle(id: string) {
    if (!unlocked) {
      onLockedClick()
      return
    }
    setBusyId(id)
    setError(null)
    try {
      await downloadMaterial(id)
      const m = materials.find((x) => x.id === id)
      track('material_downloaded', {
        lesson_id: m?.lesson_id ?? null,
        course_id: courseId ?? null,
        material_id: id,
        titulo: m?.title,
        arquivo: m?.file_name,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível baixar o material.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ marginBottom: 44 }}>
      <Kicker style={{ marginBottom: 16 }}>Leve com você</Kicker>

      {error && (
        <div style={{ marginBottom: 14 }}>
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {materials.map((m) => (
          <button
            key={m.id}
            onClick={() => void handle(m.id)}
            disabled={busyId === m.id}
            className="k-hoverable"
            style={{
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              background: 'var(--sf)',
              border: '1px solid var(--line)',
              borderRadius: 16,
              padding: '16px 20px',
              cursor: 'pointer',
              color: 'var(--tx)',
            }}
          >
            <div
              style={{
                flex: 'none',
                width: 36,
                height: 36,
                borderRadius: 11,
                background: 'var(--sf2)',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9.5,
                fontWeight: 700,
                color: 'var(--p2)',
              }}
            >
              {fileExtension(m.file_name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--tx3)', marginTop: 2 }}>
                {[m.description, formatFileSize(m.file_size)].filter(Boolean).join(' · ')}
              </div>
            </div>
            <span
              style={{
                flex: 'none',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--p2)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {busyId === m.id && <Spinner size={12} />}
              {unlocked ? 'Baixar' : 'Ver acesso'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
