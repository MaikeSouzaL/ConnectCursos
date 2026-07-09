import { ConstructionIcon, type LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'

export function PlaceholderPage({
  title,
  description,
  icon = ConstructionIcon,
  note = 'Esta tela será construída no próximo bloco do projeto.',
}: {
  title: string
  description?: string
  icon?: LucideIcon
  note?: string
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} title="Em construção" description={note} />
    </div>
  )
}
