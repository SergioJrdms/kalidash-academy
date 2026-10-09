import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { identify, initAnalytics, resetIdentity, trackPageview } from './lib/analytics'
import AppLayout from './components/AppLayout'
import { PageLoading, Spinner } from './components/ui'

const Landing = lazy(() => import('./pages/Landing'))
const Privacidade = lazy(() => import('./pages/Privacidade'))
const Termos = lazy(() => import('./pages/Termos'))
const Login = lazy(() => import('./pages/Login'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Home = lazy(() => import('./pages/Home'))
const Explorar = lazy(() => import('./pages/Explorar'))
const Conteudo = lazy(() => import('./pages/Conteudo'))
const Aula = lazy(() => import('./pages/Aula'))
const Jornada = lazy(() => import('./pages/Jornada'))
const Aplicar = lazy(() => import('./pages/Aplicar'))
const Eventos = lazy(() => import('./pages/Eventos'))
const Comunidade = lazy(() => import('./pages/Comunidade'))
const Perfil = lazy(() => import('./pages/Perfil'))

const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const AdminCourses = lazy(() => import('./admin/AdminCourses'))
const AdminCourseEdit = lazy(() => import('./admin/AdminCourseEdit'))
const AdminLessonEdit = lazy(() => import('./admin/AdminLessonEdit'))
const AdminEvents = lazy(() => import('./admin/AdminEvents'))
const AdminComunidade = lazy(() => import('./admin/AdminComunidade'))
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
      <Spinner size={26} color="var(--imperial)" />
    </div>
  )
}

/**
 * Uma tela do aluno, com a própria espera.
 *
 * Sem isto, só a Início tinha Suspense: trocar para Explorar ou Eventos
 * caía no Suspense de fora e apagava a casca toda — menu, topo, tudo —
 * para pôr um giro no meio do nada. Agora a casca fica parada e só o
 * miolo mostra o esqueleto, no formato da tela que está vindo.
 */
function Pagina({
  children,
  titulo,
  blocos,
}: {
  children: React.ReactNode
  titulo?: string
  blocos?: number[]
}) {
  return <Suspense fallback={<PageLoading titulo={titulo} blocos={blocos} />}>{children}</Suspense>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoading />

  if (!session) {
    // A raiz tem versão pública. A verificação do Google recusou o app
    // justamente porque a página inicial ficava atrás do login e não
    // explicava a finalidade; as demais telas continuam protegidas.
    if (location.pathname === '/') return <Landing />
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <FullScreenLoading />
  if (!session) return <Navigate to="/login" replace />
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

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
        <AnalyticsBoot />
        <Suspense fallback={<FullScreenLoading />}>
          <Routes>
            {/* ---------- páginas abertas ---------- */}
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/termos" element={<Termos />} />

            <Route path="/login" element={<Login />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route
              path="/onboarding"
              element={
                <RequireAuth>
                  <Onboarding />
                </RequireAuth>
              }
            />

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
                  <Pagina titulo="38%" blocos={[240, 200, 260]}>
                    <Home />
                  </Pagina>
                }
              />
              <Route
                path="explorar"
                element={
                  <Pagina titulo="44%" blocos={[64, 166, 166, 166]}>
                    <Explorar />
                  </Pagina>
                }
              />
              {/* endereço antigo do catálogo */}
              <Route path="conteudos" element={<Navigate to="/explorar" replace />} />
              <Route
                path="conteudos/:slug"
                element={
                  <Pagina titulo="42%" blocos={[260, 180, 140, 380]}>
                    <Conteudo />
                  </Pagina>
                }
              />
              <Route
                path="aula/:lessonId"
                element={
                  <Pagina titulo="60%" blocos={[420, 220]}>
                    <Aula />
                  </Pagina>
                }
              />
              <Route
                path="jornada"
                element={
                  <Pagina titulo="34%" blocos={[300, 420]}>
                    <Jornada />
                  </Pagina>
                }
              />
              <Route
                path="aplicar"
                element={
                  <Pagina titulo="18%" blocos={[520, 150]}>
                    <Aplicar />
                  </Pagina>
                }
              />
              <Route
                path="eventos"
                element={
                  <Pagina titulo="20%" blocos={[560, 180]}>
                    <Eventos />
                  </Pagina>
                }
              />
              <Route
                path="comunidade"
                element={
                  <Pagina titulo="26%" blocos={[96, 300, 240]}>
                    <Comunidade />
                  </Pagina>
                }
              />
              <Route
                path="perfil"
                element={
                  <Pagina titulo="30%" blocos={[232, 96, 330, 150]}>
                    <Perfil />
                  </Pagina>
                }
              />
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
              <Route
                path="cursos"
                element={
                  <Pagina>
                    <AdminCourses />
                  </Pagina>
                }
              />
              <Route
                path="cursos/:courseId"
                element={
                  <Pagina>
                    <AdminCourseEdit />
                  </Pagina>
                }
              />
              <Route
                path="aulas/:lessonId"
                element={
                  <Pagina>
                    <AdminLessonEdit />
                  </Pagina>
                }
              />
              <Route
                path="eventos"
                element={
                  <Pagina>
                    <AdminEvents />
                  </Pagina>
                }
              />
              <Route
                path="comunidade"
                element={
                  <Pagina>
                    <AdminComunidade />
                  </Pagina>
                }
              />
              <Route
                path="usuarios"
                element={
                  <Pagina>
                    <AdminUsers />
                  </Pagina>
                }
              />
              <Route
                path="insights"
                element={
                  <Pagina>
                    <AdminInsights />
                  </Pagina>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
