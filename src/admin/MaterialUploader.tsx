import { useEffect, useState } from 'react'
import {
  adminCreateMaterial,
  adminDeleteMaterial,
  adminListMaterials,
} from '../services/admin'
import { removeMaterialFile, uploadMaterialFile } from '../services/media'
import { downloadMaterial } from '../services/media'
import { fileExtension, formatFileSize } from '../lib/format'
import type { LessonMaterial } from '../types/db'
import { Banner, Field, GhostButton, inputStyle, PrimaryButton, Spinner } from '../components/ui'

const ACCEPT =
  '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.csv,.txt,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/csv,text/plain,application/zip'

const MAX_BYTES = 50 * 1024 * 1024

export default function MaterialUploader({ lessonId }: { lessonId: string }) {
  const [materials, setMaterials] = useState<LessonMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)

  async function load() {
    setLoading(true)
    try {
      setMaterials(await adminListMaterials(lessonId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar materiais.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [lessonId])

  async function add() {
    if (!file) {
      setError('Escolha um arquivo.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError(`Arquivo muito grande (${formatFileSize(file.size)}). O limite é 50 MB.`)
      return
    }

    setAdding(true)
    setError(null)
    let uploadedPath: string | null = null
    try {
      const { storagePath } = await uploadMaterialFile(file, lessonId)
      uploadedPath = storagePath
      const created = await adminCreateMaterial({
        lesson_id: lessonId,
        title: title.trim() || file.name,
        description: description.trim() || null,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        file_size: file.size,
        sort_order: materials.length + 1,
      })
      setMaterials((m) => [...m, created])
      setTitle('')
      setDescription('')
      setFile(null)
    } catch (err) {
      // não deixa arquivo órfão no bucket se a linha falhar
      if (uploadedPath) await removeMaterialFile(uploadedPath).catch(() => {})
      setError(err instanceof Error ? err.message : 'Erro ao adicionar o material.')
    } finally {
      setAdding(false)
    }
  }

  async function remove(m: LessonMaterial) {
    if (!window.confirm(`Remover "${m.title}"?\n\nO arquivo será apagado do Storage.`)) return
    setBusyId(m.id)
    setError(null)
    try {
      await adminDeleteMaterial(m.id)
      await removeMaterialFile(m.storage_path).catch(() => {})
      setMaterials((list) => list.filter((x) => x.id !== m.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      style={{
        background: 'var(--sf)',
        border: '1px solid var(--line)',
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
          color: 'var(--tx3)',
          marginBottom: 16,
        }}
      >
        Materiais adicionais
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <Spinner size={18} />
      ) : materials.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--tx3)', marginBottom: 20 }}>
          Nenhum material nesta aula ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
          {materials.map((m) => (
            <div
              key={m.id}
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
              <div
                style={{
                  flex: 'none',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'var(--sf2)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--p2)',
                }}
              >
                {fileExtension(m.file_name)}
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--tx3)' }}>
                  {[m.file_name, formatFileSize(m.file_size)].filter(Boolean).join(' · ')}
                </div>
              </div>
              {busyId === m.id && <Spinner size={13} />}
              <button
                onClick={() => void downloadMaterial(m.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--p2)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Baixar
              </button>
              <button
                onClick={() => void remove(m)}
                disabled={busyId === m.id}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          borderTop: '1px solid var(--line)',
          paddingTop: 20,
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
        }}
      >
        <Field label="Título">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Matriz de priorização"
            style={inputStyle}
          />
        </Field>
        <Field label="Descrição">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Imprimir e preencher com o time"
            style={inputStyle}
          />
        </Field>
        <Field label="Arquivo" hint="PDF, DOCX, XLSX, PPTX, CSV, TXT ou ZIP · até 50 MB">
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '13px 16px',
              cursor: 'pointer',
              fontSize: 13,
              color: file ? 'var(--tx)' : 'var(--tx3)',
              background: 'var(--sf2)',
            }}
          >
            {file ? `${file.name} · ${formatFileSize(file.size)}` : 'Escolher arquivo'}
            <input
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <PrimaryButton onClick={() => void add()} disabled={adding} style={{ padding: '13px 24px' }}>
            {adding ? 'Enviando...' : 'Adicionar material'}
          </PrimaryButton>
          {file && (
            <GhostButton onClick={() => setFile(null)} style={{ padding: '12px 18px' }}>
              Limpar
            </GhostButton>
          )}
        </div>
      </div>
    </div>
  )
}
