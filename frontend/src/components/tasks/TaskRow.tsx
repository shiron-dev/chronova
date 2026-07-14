import { clsx } from 'clsx'
import { useSearchParams } from 'react-router'
import type { Task } from '../../api/types'
import { formatDueDate, isOverdue } from '../../lib/date'
import { useUpdateTask } from '../../hooks/useTasks'
import { useUI } from '../../stores/ui'
import { AvatarStack } from '../members/MemberAvatar'
import { StatusSelect } from './properties/StatusSelect'
import { PrioritySelect } from './properties/PrioritySelect'
import { ProjectDot } from './properties/ProjectSelect'

export function TaskRow({ task, showProject = true }: { task: Task; showProject?: boolean }) {
  const updateTask = useUpdateTask()
  const selected = useUI((s) => s.selectedTaskId === task.id)
  const setSelectedTaskId = useUI((s) => s.setSelectedTaskId)
  const [, setSearchParams] = useSearchParams()
  const isTemp = task.id < 0
  const overdue = isOverdue(task)

  const open = () => {
    setSearchParams((prev) => {
      prev.set('task', String(task.id))
      return prev
    })
  }

  return (
    <div
      data-task-id={task.id}
      onClick={isTemp ? undefined : open}
      onMouseEnter={() => setSelectedTaskId(task.id)}
      className={clsx(
        'flex h-9 cursor-default select-none items-center gap-2.5 border-b border-edge/60 px-6',
        selected && 'bg-hover',
        isTemp && 'pointer-events-none opacity-50',
      )}
    >
      <PrioritySelect
        variant="icon"
        value={task.priority}
        onChange={(priority) => updateTask.mutate({ id: task.id, patch: { priority } })}
      />
      <span className="w-14 shrink-0 text-xs tabular-nums text-faint">{task.identifier}</span>
      <StatusSelect
        variant="icon"
        value={task.status}
        onChange={(status) => updateTask.mutate({ id: task.id, patch: { status } })}
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
        {task.title}
      </span>
      {showProject && task.project && (
        <span className="hidden max-w-40 items-center gap-1.5 truncate text-xs text-dim md:inline-flex">
          <ProjectDot color={task.project.color} size={8} />
          <span className="truncate">{task.project.name}</span>
        </span>
      )}
      {task.due_date && (
        <span className={clsx('shrink-0 text-xs tabular-nums', overdue ? 'text-danger' : 'text-dim')}>
          {formatDueDate(task.due_date)}
        </span>
      )}
      <span className="w-14 shrink-0 text-right">
        <AvatarStack assignees={task.assignees} />
      </span>
    </div>
  )
}
