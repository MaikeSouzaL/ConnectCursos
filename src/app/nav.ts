import {
  BanknoteIcon,
  CalendarDaysIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  QrCodeIcon,
  SettingsIcon,
  UsersIcon,
  UserSquareIcon,
  BookOpenIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}
export interface NavSection {
  title: string
  items: NavItem[]
}

export const adminNav: NavSection[] = [
  {
    title: 'Principal',
    items: [{ label: 'Dashboard', to: '/admin', icon: LayoutDashboardIcon }],
  },
  {
    title: 'Gestão',
    items: [
      { label: 'Alunos', to: '/admin/alunos', icon: UsersIcon },
      { label: 'Turmas', to: '/admin/turmas', icon: GraduationCapIcon },
      { label: 'Cursos', to: '/admin/cursos', icon: BookOpenIcon },
      { label: 'Professores', to: '/admin/professores', icon: UserSquareIcon },
    ],
  },
  {
    title: 'Operação',
    items: [
      { label: 'Chamadas & QR', to: '/admin/chamadas', icon: QrCodeIcon },
      { label: 'Salas & Agenda', to: '/admin/salas', icon: CalendarDaysIcon },
    ],
  },
  {
    title: 'Financeiro',
    items: [{ label: 'Financeiro', to: '/admin/financeiro', icon: BanknoteIcon }],
  },
  {
    title: 'Sistema',
    items: [{ label: 'Configurações', to: '/admin/configuracoes', icon: SettingsIcon }],
  },
]
