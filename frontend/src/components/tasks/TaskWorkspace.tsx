import { useEffect, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import type { TaskFilters } from '../../api/tasks'
import { t } from '../../lib/i18n'
import { useTasksList } from '../../hooks/useTasks'
import { useUI } from '../../stores/ui'
import { Button } from '../ui/Button'
import { Kbd } from '../ui/Kbd'
import { TaskListView } from './TaskListView'
import { KanbanBoard } from './KanbanBoard'
import { ViewToggle, useCurrentView } from './ViewToggle'

function SkeletonRows() {
  return (
    <div className="flex flex-col gap-2 p-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-8 animate-pulse rounded-md bg-raise"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  )
}

/** タスク一覧ページの共通骨格(ヘッダー + リスト/ボード切替) */
export function TaskWorkspace({
  title,
  filters,
  showProject = true,
}: {
  title: ReactNode
  filters: TaskFilters
  showProject?: boolean
}) {
  const { data: tasks, isLoading } = useTasksList(filters)
  const view = useCurrentView()
  const setPageDefaults = useUI((s) => s.setPageDefaults)
  const openNewTask = useUI((s) => s.openNewTask)

  const projectId = filters.projectId
  useEffect(() => {
    setPageDefaults(projectId != null ? { projectId } : {})
    return () => setPageDefaults({})
  }, [projectId, setPageDefaults])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-13 shrink-0 items-center gap-3 border-b border-edge px-6">
        <h1 className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold text-ink">
          {title}
        </h1>
        {tasks && <span className="text-xs tabular-nums text-dim">{tasks.length}</span>}
        <span className="ml-auto" />
        <ViewToggle />
        <Button variant="primary" size="sm" onClick={() => openNewTask()}>
          <Plus size={13} />
          {t.actions.newTask}
          <Kbd className="border-white/20 bg-white/10 text-white/70">C</Kbd>
        </Button>
      </header>
      {isLoading || !tasks ? (
        <SkeletonRows />
      ) : view === 'list' ? (
        <TaskListView tasks={tasks} showProject={showProject} />
      ) : (
        <KanbanBoard tasks={tasks} showProject={showProject} />
      )}
    </div>
  )
}
