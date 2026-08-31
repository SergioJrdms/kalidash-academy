import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { applyTheme, getStoredTheme } from './lib/theme'
import { identify, initAnalytics, resetIdentity, trackPageview } from './lib/analytics'
import AppLayout from './components/AppLayout'
import { PageLoading, Spinner } from './components/ui'

const Login = lazy(() => import('./pages/Login'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Home = lazy(() => import('./pages/Home'))
const Conteudos = lazy(() => import('./pages/Conteudos'))
const Conteudo = lazy(() => import('./pages/Conteudo'))
const Aula = lazy(() => import('./pages/Aula'))
const Eventos = lazy(() => import('./pages/Eventos'))
const Perfil = lazy(() => import('./pages/Perfil'))

const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const AdminCourses = lazy(() => import('./admin/AdminCourses'))
const AdminCourseEdit = lazy(() => import('./admin/AdminCourseEdit'))
const AdminLessonEdit = lazy(() => import('./admin/AdminLessonEdit'))
const AdminEvents = lazy(() => import('./admin/AdminEvents'))
const AdminUsers = lazy(() => import('./admin/AdminUsers'))
const AdminInsights = lazy(() => import('./admin/AdminInsights'))

function FullScreenLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}
    >
      <Spinner size={26} color="var(--p2)" />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoading />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <FullScreenLoading />
  if (!session) return <Navigate to="/login" replace />
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

function ThemeBoot() {
  useEffect(() => {
    applyTheme(getStoredTheme())
  }, [])
  return null
}

/**
 * Liga o PostHog ao ciclo de vida do app: identifica quando a sessão
 * aparece, esquece no logout e registra pageview a cada troca de rota
 * (o React Router não recarrega a página, então o automático não serve).
 */
function AnalyticsBoot() {
  const { session, profile } = useAuth()
  const location = useLocation()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    if (session?.user && profile) {
      identify(session.user.id, {
        area: profile.area ?? undefined,
        goal: profile.goal ?? undefined,
        company: profile.company ?? undefined,
        access_level: profile.access_level,
        role: profile.role,
      })
    } else if (!session) {
      resetIdentity()
    }
  }, [session?.user.id, profile?.area, profile?.access_level, profile?.role])

  useEffect(() => {
    trackPageview(location.pathname + location.search)
  }, [location.pathname, location.search])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeBoot />
        <AnalyticsBoot />
        <Suspense fallback={<FullScreenLoading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />

            {/* ---------- aluno ---------- */}
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route
                index
                element={
                  <Suspense fallback={<PageLoading />}>
                    <Home />
                  </Suspense>
                }
              />
              <Route path="conteudos" element={<Conteudos />} />
              <Route path="conteudos/:slug" element={<Conteudo />} />
              <Route path="aula/:lessonId" element={<Aula />} />
              <Route path="eventos" element={<Eventos />} />
              <Route path="perfil" element={<Perfil />} />
            </Route>

            {/* ---------- admin ---------- */}
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<Navigate to="/admin/cursos" replace />} />
              <Route path="cursos" element={<AdminCourses />} />
              <Route path="cursos/:courseId" element={<AdminCourseEdit />} />
              <Route path="aulas/:lessonId" element={<AdminLessonEdit />} />
              <Route path="eventos" element={<AdminEvents />} />
              <Route path="usuarios" element={<AdminUsers />} />
              <Route path="insights" element={<AdminInsights />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
