import { supabase } from '../lib/supabase'

export type DirectoryPerson = {
  id: string
  full_name: string | null
  headline: string | null
  company: string | null
  area: string | null
  interest: string | null
  /** Só vem preenchido quando a conexão foi aceita pelos dois lados. */
  linkedin_url: string | null
}

export type Connection = {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
  created_at: string
}

export type JobOpening = {
  id: string
  title: string
  company: string
  location: string | null
  contract_type: string | null
  description: string | null
  apply_url: string | null
  posted_at: string
}

export type CommunityStats = { members: number; jobs: number }

export async function loadDirectory(): Promise<DirectoryPerson[]> {
  const { data, error } = await supabase
    .from('community_directory')
    .select('*')
    .order('full_name')
  if (error) throw new Error(error.message)
  return (data ?? []) as DirectoryPerson[]
}

export async function loadConnections(userId: string): Promise<Connection[]> {
  const { data } = await supabase
    .from('connections')
    .select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  return (data ?? []) as Connection[]
}

export async function loadJobs(): Promise<JobOpening[]> {
  const { data, error } = await supabase
    .from('job_openings')
    .select('id, title, company, location, contract_type, description, apply_url, posted_at')
    .eq('status', 'published')
    .order('posted_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as JobOpening[]
}

export async function loadCommunityStats(): Promise<CommunityStats> {
  const { data } = await supabase.from('community_stats').select('*').maybeSingle()
  return (data as CommunityStats) ?? { members: 0, jobs: 0 }
}

export async function requestConnection(userId: string, otherId: string): Promise<Connection> {
  const { data, error } = await supabase
    .from('connections')
    .insert({ requester_id: userId, addressee_id: otherId })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as Connection
}

/** Aceitar só funciona para quem recebeu o pedido — a RLS garante isso. */
export async function acceptConnection(id: string): Promise<void> {
  const { error } = await supabase
    .from('connections')
    .update({ status: 'accepted' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function removeConnection(id: string): Promise<void> {
  const { error } = await supabase.from('connections').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Entra ou sai do diretório, e atualiza os campos que ele mostra. */
export async function saveCommunityProfile(
  userId: string,
  patch: {
    community_opt_in?: boolean
    headline?: string | null
    interest?: string | null
    linkedin_url?: string | null
    company?: string | null
  },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) throw new Error(error.message)
}
