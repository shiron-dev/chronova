import { useParams } from 'react-router'
import { SearchX } from 'lucide-react'
import { t } from '../lib/i18n'
import { useProjectsList } from '../hooks/useProjects'
import { TaskWorkspace } from '../components/tasks/TaskWorkspace'
import { ProjectDot } from '../components/tasks/properties/ProjectSelect'
import { EmptyState } from '../components/ui/EmptyState'

export function ProjectPage() {
  const { projectId } = useParams()
  const id = Number(projectId)
  const { data: projects, isLoading } = useProjectsList()
  const project = projects?.find((p) => p.id === id)

  if (!isLoading && !project) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-13 shrink-0 items-center border-b border-edge px-6">
          <h1 className="text-sm font-semibold text-ink">{t.nav.projects}</h1>
        </header>
        <EmptyState icon={SearchX} title={t.project.notFound} />
      </div>
    )
  }

  return (
    <TaskWorkspace
      title={
        <>
          {project && <ProjectDot color={project.color} size={10} />}
          <span className="truncate">{project?.name ?? ''}</span>
        </>
      }
      filters={{ projectId: id }}
      showProject={false}
    />
  )
}
