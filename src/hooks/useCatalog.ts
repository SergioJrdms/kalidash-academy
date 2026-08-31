import { useCallback, useEffect, useState } from 'react'
import { loadCatalog, type CatalogCourse } from '../services/catalog'
import { useAuth } from './useAuth'

export function useCatalog() {
  const { session } = useAuth()
  const userId = session?.user.id ?? null

  const [courses, setCourses] = useState<CatalogCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCourses(await loadCatalog(userId))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não conseguimos carregar os conteúdos agora.',
      )
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { courses, loading, error, reload }
}
