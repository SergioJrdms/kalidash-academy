import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { applyTheme, getStoredTheme } from './lib/theme'
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeBoot />
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
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
