import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Inbox, Plus } from 'lucide-react'
import type { Status, Task } from '../../api/types'
import { STATUS_ORDER, statusMeta } from '../../lib/labels'
import { t } from '../../lib/i18n'
import { useUI } from '../../stores/ui'
import { EmptyState } from '../ui/EmptyState'
import { StatusIcon } from './StatusIcon'
import { TaskRow } from './TaskRow'

function TaskGroup({
  status,
  tasks,
  showProject,
}: {
  status: Status
  tasks: Task[]
  showProject: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const openNewTask = useUI((s) => s.openNewTask)
  const pageDefaults = useUI((s) => s.pageDefaults)

  return (
    <section>
      <div className="group sticky top-0 z-10 flex h-9 items-center gap-2 border-b border-edge/60 bg-raise/95 px-6 backdrop-blur">
        <button
          className="flex items-center gap-2 text-dim hover:text-ink"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          <StatusIcon status={status} />
          <span className="text-[13px] font-medium text-ink">{statusMeta[status].label}</span>
          <span className="text-xs text-dim">{tasks.length}</span>
        </button>
        <button
          className="ml-auto flex h-6 w-6 items-center justify-center rounded text-dim opacity-0 transition-opacity hover:bg-active hover:text-ink group-hover:opacity-100"
          onClick={() => openNewTask({ ...pageDefaults, status })}
          aria-label={t.actions.newTask}
        >
          <Plus size={14} />
        </button>
      </div>
      {!collapsed && tasks.map((task) => <TaskRow key={task.id} task={task} showProject={showProject} />)}
    </section>
  )
}

export function TaskListView({
  tasks,
  showProject = true,
}: {
  tasks: Task[]
  showProject?: boolean
}) {
  const setVisibleTaskIds = useUI((s) => s.setVisibleTaskIds)

  const groups = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    return STATUS_ORDER.map((status) => ({
      status,
      tasks: sorted.filter((task) => task.status === status),
    }))
  }, [tasks])

  const orderedIds = useMemo(
    () => groups.flatMap((g) => g.tasks.map((task) => task.id)).filter((id) => id > 0),
    [groups],
  )
  const orderKey = orderedIds.join(',')
  useEffect(() => {
    setVisibleTaskIds(orderedIds)
    // orderKey が実質的な依存キー
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey, setVisibleTaskIds])

  if (tasks.length === 0) {
    return <EmptyState icon={Inbox} title={t.empty.noTasks} hint={t.empty.noTasksHint} />
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {groups
        .filter((g) => g.tasks.length > 0)
        .map((g) => (
          <TaskGroup key={g.status} status={g.status} tasks={g.tasks} showProject={showProject} />
        ))}
    </div>
  )
}
