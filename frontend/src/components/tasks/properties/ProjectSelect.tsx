import { Box, Check } from 'lucide-react'
import type { ProjectRef } from '../../../api/types'
import { t } from '../../../lib/i18n'
import { useProjectsList } from '../../../hooks/useProjects'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu'
import { chipClass } from './chipStyle'

export function ProjectDot({ color, size = 9 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-[3px]"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  )
}

export function ProjectSelect({
  value,
  onChange,
}: {
  value: ProjectRef | null
  onChange: (projectId: number | null) => void
}) {
  const { data: projects = [] } = useProjectsList()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={chipClass} onClick={(e) => e.stopPropagation()} aria-label={t.fields.project}>
          {value ? <ProjectDot color={value.color} /> : <Box size={14} className="text-dim" />}
          <span className="max-w-40 truncate">{value ? value.name : t.task.noProject}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => onChange(null)}>
          <Box size={14} className="text-dim" />
          <span className="flex-1">{t.task.noProject}</span>
          {value == null && <Check size={14} className="text-accent" />}
        </DropdownMenuItem>
        {projects.map((project) => (
          <DropdownMenuItem key={project.id} onSelect={() => onChange(project.id)}>
            <ProjectDot color={project.color} />
            <span className="flex-1 truncate">{project.name}</span>
            {value?.id === project.id && <Check size={14} className="text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
