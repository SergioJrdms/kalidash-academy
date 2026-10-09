import { supabase } from '../lib/supabase'

export type DirectoryPerson = {
  id: string
  full_name: string | null
  headline: string | null
  company: string | null
  area: string | null
  interest: string | null
  avatar_url: string | null
  /** Visível para todo mundo que está no diretório. */
  linkedin_url: string | null
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
