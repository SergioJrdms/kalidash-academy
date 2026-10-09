import { useEffect, useState } from 'react'
import {
  adminCreateJob,
  adminDeleteJob,
  adminListDirectory,
  adminListJobs,
  adminUpdateDirectory,
  adminUpdateJob,
  type AdminJob,
} from '../services/admin'
import type { Profile } from '../types/db'
import { Banner, GhostButton, PrimaryButton, Skeleton, Spinner, inputStyle } from '../components/ui'

const selectStyle = { ...inputStyle, cursor: 'pointer' }

/**
 * Comunidade no Admin: quem aparece no diretório de networking e com
 * qual LinkedIn, e as vagas em destaque.
 *
 * O diretório é opt-in da pessoa, mas o Admin precisa poder corrigir um
 * link errado ou tirar alguém da lista — por isso as duas coisas ficam
 * aqui, e não só na tela do aluno.
 */
export default function AdminComunidade() {
  return (
    <div style={{ padding: '32px 28px 80px', maxWidth: 1100, margin: '0 auto' }}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 26,
          margin: '0 0 6px',
        }}
      >
        Comunidade
      </h1>
      <p style={{ fontSize: 13.5, color: 'var(--tx2)', margin: '0 0 32px' }}>
        O diretório de networking e as vagas que aparecem para os alunos.
      </p>

      <Diretorio />
      <Vagas />
    </div>
  )
}

// ---------------------------------------------------------------------

function Diretorio() {
  const [pessoas, setPessoas] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [rascunho, setRascunho] = useState<Record<string, Partial<Profile>>>({})

  async function load() {
    setLoading(true)
    try {
      setPessoas(await adminListDirectory())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar o diretório.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function editar(id: string, campo: keyof Profile, valor: string | boolean) {
    setRascunho((r) => ({ ...r, [id]: { ...r[id], [campo]: valor } }))
  }

  function valor(p: Profile, campo: 'headline' | 'company' | 'interest' | 'linkedin_url') {
    const r = rascunho[p.id]?.[campo]
    return (r as string | null | undefined) ?? p[campo] ?? ''
  }

  function visivel(p: Profile) {
    const r = rascunho[p.id]?.community_opt_in
    return typeof r === 'boolean' ? r : p.community_opt_in
  }

  async function salvar(p: Profile) {
    setSalvando(p.id)
    setErro(null)
    try {
      const atualizado = await adminUpdateDirectory(p.id, {
        community_opt_in: visivel(p),
        headline: valor(p, 'headline') || null,
        company: valor(p, 'company') || null,
        interest: valor(p, 'interest') || null,
        linkedin_url: valor(p, 'linkedin_url') || null,
      })
      setPessoas((lista) => lista.map((x) => (x.id === p.id ? atualizado : x)))
      setRascunho((r) => {
        const n = { ...r }
        delete n[p.id]
        return n
      })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(null)
    }
  }

  if (loading) return <Skeleton height={200} />

  const noDiretorio = pessoas.filter((p) => p.community_opt_in).length

  return (
    <section style={{ marginBottom: 48 }}>
      <Cabeca
        titulo="Diretório de networking"
        texto={`${noDiretorio} de ${pessoas.length} ${pessoas.length === 1 ? 'pessoa aparece' : 'pessoas aparecem'} em "Pessoas para você conhecer". O botão do cartão leva ao LinkedIn.`}
      />

      {erro && (
        <div style={{ marginBottom: 16 }}>
          <Banner kind="error">{erro}</Banner>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pessoas.map((p) => {
          const mudou = Boolean(rascunho[p.id])
          return (
            <div
              key={p.id}
              style={{
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                borderRadius: 14,
                padding: 16,
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
                <strong style={{ fontSize: 14 }}>{p.full_name ?? 'Sem nome'}</strong>
                <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{p.email}</span>
                <span style={{ flex: 1 }} />
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12.5,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visivel(p)}
                    onChange={(e) => editar(p.id, 'community_opt_in', e.target.checked)}
                  />
                  Aparece no diretório
                </label>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: 10,
                }}
              >
                {(
                  [
                    ['Cargo', 'headline', 'Head de Operações'],
                    ['Empresa', 'company', 'Kalidash'],
                    ['Interesse', 'interest', 'Agentes de IA'],
                    ['LinkedIn', 'linkedin_url', 'https://linkedin.com/in/...'],
                  ] as const
                ).map(([rotulo, campo, ph]) => (
                  <label key={campo}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11.5,
                        color: 'var(--tx2)',
                        marginBottom: 5,
                      }}
                    >
                      {rotulo}
                    </span>
                    <input
                      value={valor(p, campo)}
                      onChange={(e) => editar(p.id, campo, e.target.value)}
                      placeholder={ph}
                      style={{ ...inputStyle, fontSize: 13, padding: '9px 11px' }}
                    />
                  </label>
                ))}
              </div>

              {mudou && (
                <div style={{ marginTop: 14 }}>
                  <PrimaryButton onClick={() => void salvar(p)} disabled={salvando === p.id}>
                    {salvando === p.id && <Spinner size={12} color="#fff" />}
                    Salvar
                  </PrimaryButton>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------

const VAZIA: Partial<AdminJob> = {
  title: 'Nova vaga',
  company: '',
  location: '',
  contract_type: 'Tempo integral',
  description: '',
  apply_url: '',
  status: 'draft',
}

function Vagas() {
  const [vagas, setVagas] = useState<AdminJob[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [rascunho, setRascunho] = useState<Record<string, Partial<AdminJob>>>({})

  async function load() {
    setLoading(true)
    try {
      setVagas(await adminListJobs())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar as vagas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  function editar(id: string, campo: keyof AdminJob, v: string) {
    setRascunho((r) => ({ ...r, [id]: { ...r[id], [campo]: v } }))
  }

  function valor(v: AdminJob, campo: keyof AdminJob) {
    const r = rascunho[v.id]?.[campo]
    return ((r as string | null | undefined) ?? v[campo] ?? '') as string
  }

  async function criar() {
    setErro(null)
    try {
      const nova = await adminCreateJob({ ...VAZIA, company: 'Empresa' })
      setVagas((l) => [nova, ...l])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar.')
    }
  }

  async function salvar(v: AdminJob) {
    setSalvando(v.id)
    setErro(null)
    try {
      const atualizada = await adminUpdateJob(v.id, {
        title: valor(v, 'title'),
        company: valor(v, 'company'),
        location: valor(v, 'location') || null,
        contract_type: valor(v, 'contract_type') || null,
        description: valor(v, 'description') || null,
        apply_url: valor(v, 'apply_url') || null,
        status: valor(v, 'status') as 'draft' | 'published',
      })
      setVagas((l) => l.map((x) => (x.id === v.id ? atualizada : x)))
      setRascunho((r) => {
        const n = { ...r }
        delete n[v.id]
        return n
      })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(null)
    }
  }

  async function remover(v: AdminJob) {
    if (!window.confirm(`Remover a vaga "${v.title}"? Isso não volta atrás.`)) return
    setSalvando(v.id)
    try {
      await adminDeleteJob(v.id)
      setVagas((l) => l.filter((x) => x.id !== v.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível remover.')
    } finally {
      setSalvando(null)
    }
  }

  if (loading) return <Skeleton height={200} />

  return (
    <section>
      <Cabeca
        titulo="Vagas em destaque"
        texto="Aparecem na Comunidade, da mais recente para a mais antiga. Só as publicadas são visíveis."
        acao={<GhostButton onClick={() => void criar()}>Nova vaga</GhostButton>}
      />

      {erro && (
        <div style={{ marginBottom: 16 }}>
          <Banner kind="error">{erro}</Banner>
        </div>
      )}

      {vagas.length === 0 ? (
        <p style={{ fontSize: 13.5, color: 'var(--tx2)' }}>
          Nenhuma vaga cadastrada. Crie a primeira no botão acima.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {vagas.map((v) => {
            const mudou = Boolean(rascunho[v.id])
            return (
              <div
                key={v.id}
                style={{
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  {(
                    [
                      ['Título', 'title', 'AI Operations Specialist'],
                      ['Empresa', 'company', 'Vértice'],
                      ['Local', 'location', 'São Paulo · Híbrido'],
                      ['Contrato', 'contract_type', 'Tempo integral'],
                      ['Link para aplicar', 'apply_url', 'https://...'],
                    ] as const
                  ).map(([rotulo, campo, ph]) => (
                    <label key={campo}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 11.5,
                          color: 'var(--tx2)',
                          marginBottom: 5,
                        }}
                      >
                        {rotulo}
                      </span>
                      <input
                        value={valor(v, campo)}
                        onChange={(e) => editar(v.id, campo, e.target.value)}
                        placeholder={ph}
                        style={{ ...inputStyle, fontSize: 13, padding: '9px 11px' }}
                      />
                    </label>
                  ))}

                  <label>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11.5,
                        color: 'var(--tx2)',
                        marginBottom: 5,
                      }}
                    >
                      Situação
                    </span>
                    <select
                      value={valor(v, 'status')}
                      onChange={(e) => editar(v.id, 'status', e.target.value)}
                      style={{ ...selectStyle, fontSize: 13, padding: '9px 11px' }}
                    >
                      <option value="draft">Rascunho</option>
                      <option value="published">Publicada</option>
                    </select>
                  </label>
                </div>

                <label>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 11.5,
                      color: 'var(--tx2)',
                      marginBottom: 5,
                    }}
                  >
                    Descrição
                  </span>
                  <textarea
                    value={valor(v, 'description')}
                    onChange={(e) => editar(v.id, 'description', e.target.value)}
                    rows={2}
                    style={{
                      ...inputStyle,
                      fontSize: 13,
                      padding: '9px 11px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </label>

                <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
                  {mudou && (
                    <PrimaryButton onClick={() => void salvar(v)} disabled={salvando === v.id}>
                      {salvando === v.id && <Spinner size={12} color="#fff" />}
                      Salvar
                    </PrimaryButton>
                  )}
                  <span style={{ flex: 1 }} />
                  <button
                    onClick={() => void remover(v)}
                    disabled={salvando === v.id}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--tx3)',
                      fontSize: 12.5,
                      cursor: 'pointer',
                    }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Cabeca({
  titulo,
  texto,
  acao,
}: {
  titulo: string
  texto: string
  acao?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 16,
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 18,
            margin: '0 0 5px',
          }}
        >
          {titulo}
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--tx2)', margin: 0, maxWidth: 620 }}>{texto}</p>
      </div>
      {acao}
    </div>
  )
}
