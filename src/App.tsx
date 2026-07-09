import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { PageLoading } from '@/components/shared/page-loading'
import { AdminLayout } from '@/components/layout/admin-layout'
import { RequireAuth, RequireRole } from '@/app/guards'
import { homeFor } from '@/app/routes-config'
import { useAuth } from '@/features/auth/auth-store'

// Páginas carregadas sob demanda (code-splitting por rota).
const LoginPage = lazy(() => import('@/features/auth/login-page').then((m) => ({ default: m.LoginPage })))
const ChangePasswordPage = lazy(() => import('@/features/auth/change-password-page').then((m) => ({ default: m.ChangePasswordPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })))
const StudentsPage = lazy(() => import('@/features/students/students-page').then((m) => ({ default: m.StudentsPage })))
const StudentDetailPage = lazy(() => import('@/features/students/student-detail-page').then((m) => ({ default: m.StudentDetailPage })))
const TeachersPage = lazy(() => import('@/features/teachers/teachers-page').then((m) => ({ default: m.TeachersPage })))
const TeacherDetailPage = lazy(() => import('@/features/teachers/teacher-detail-page').then((m) => ({ default: m.TeacherDetailPage })))
const CoursesPage = lazy(() => import('@/features/courses/courses-page').then((m) => ({ default: m.CoursesPage })))
const ClassesPage = lazy(() => import('@/features/classes/classes-page').then((m) => ({ default: m.ClassesPage })))
const ClassDetailPage = lazy(() => import('@/features/classes/class-detail-page').then((m) => ({ default: m.ClassDetailPage })))
const RoomsPage = lazy(() => import('@/features/rooms/rooms-page').then((m) => ({ default: m.RoomsPage })))
const AttendancePage = lazy(() => import('@/features/attendance/attendance-page').then((m) => ({ default: m.AttendancePage })))
const CounterTerminal = lazy(() => import('@/features/attendance/counter-terminal').then((m) => ({ default: m.CounterTerminal })))
const FinancePage = lazy(() => import('@/features/finance/finance-page').then((m) => ({ default: m.FinancePage })))
const SettingsPage = lazy(() => import('@/features/settings/settings-page').then((m) => ({ default: m.SettingsPage })))
const AlunoLayout = lazy(() => import('@/components/layout/aluno-layout').then((m) => ({ default: m.AlunoLayout })))
const AlunoHomePage = lazy(() => import('@/features/aluno/home-page').then((m) => ({ default: m.AlunoHomePage })))
const AlunoScanPage = lazy(() => import('@/features/aluno/scan-page').then((m) => ({ default: m.AlunoScanPage })))
const AlunoPresencaPage = lazy(() => import('@/features/aluno/presenca-page').then((m) => ({ default: m.AlunoPresencaPage })))
const AlunoFinanceiroPage = lazy(() => import('@/features/aluno/financeiro-page').then((m) => ({ default: m.AlunoFinanceiroPage })))
const AlunoPerfilPage = lazy(() => import('@/features/aluno/perfil-page').then((m) => ({ default: m.AlunoPerfilPage })))
const ProfessorLayout = lazy(() => import('@/components/layout/professor-layout').then((m) => ({ default: m.ProfessorLayout })))
const ProfessorHomePage = lazy(() => import('@/features/professor/home-page').then((m) => ({ default: m.ProfessorHomePage })))
const ProfessorScanPage = lazy(() => import('@/features/professor/scan-page').then((m) => ({ default: m.ProfessorScanPage })))
const ProfessorTurmasPage = lazy(() => import('@/features/professor/turmas-page').then((m) => ({ default: m.ProfessorTurmasPage })))
const ProfessorChamadaPage = lazy(() => import('@/features/professor/turma-chamada-page').then((m) => ({ default: m.ProfessorChamadaPage })))
const ProfessorSalasPage = lazy(() => import('@/features/professor/salas-page').then((m) => ({ default: m.ProfessorSalasPage })))
const ProfessorPerfilPage = lazy(() => import('@/features/professor/perfil-page').then((m) => ({ default: m.ProfessorPerfilPage })))

function RootRedirect() {
  const user = useAuth((s) => s.user)
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={200}>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/trocar-senha"
              element={
                <RequireAuth>
                  <ChangePasswordPage />
                </RequireAuth>
              }
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <RequireRole role="admin">
                  <AdminLayout />
                </RequireRole>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="alunos" element={<StudentsPage />} />
              <Route path="alunos/:id" element={<StudentDetailPage />} />
              <Route path="turmas" element={<ClassesPage />} />
              <Route path="turmas/:id" element={<ClassDetailPage />} />
              <Route path="cursos" element={<CoursesPage />} />
              <Route path="professores" element={<TeachersPage />} />
              <Route path="professores/:id" element={<TeacherDetailPage />} />
              <Route path="chamadas" element={<AttendancePage />} />
              <Route path="salas" element={<RoomsPage />} />
              <Route path="financeiro" element={<FinancePage />} />
              <Route path="configuracoes" element={<SettingsPage />} />
            </Route>

            {/* Terminal do balcão (tela cheia, sem chrome do admin) */}
            <Route
              path="/balcao"
              element={
                <RequireRole role="admin">
                  <CounterTerminal />
                </RequireRole>
              }
            />

            {/* Professor (app mobile) */}
            <Route
              path="/professor"
              element={
                <RequireRole role="professor">
                  <ProfessorLayout />
                </RequireRole>
              }
            >
              <Route index element={<ProfessorHomePage />} />
              <Route path="scan" element={<ProfessorScanPage />} />
              <Route path="turmas" element={<ProfessorTurmasPage />} />
              <Route path="turmas/:id" element={<ProfessorChamadaPage />} />
              <Route path="salas" element={<ProfessorSalasPage />} />
              <Route path="perfil" element={<ProfessorPerfilPage />} />
            </Route>

            {/* Aluno (app mobile) */}
            <Route
              path="/aluno"
              element={
                <RequireRole role="aluno">
                  <AlunoLayout />
                </RequireRole>
              }
            >
              <Route index element={<AlunoHomePage />} />
              <Route path="scan" element={<AlunoScanPage />} />
              <Route path="presenca" element={<AlunoPresencaPage />} />
              <Route path="financeiro" element={<AlunoFinanceiroPage />} />
              <Route path="perfil" element={<AlunoPerfilPage />} />
            </Route>

            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Suspense>
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  )
}
