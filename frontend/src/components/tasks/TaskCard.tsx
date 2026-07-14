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

export function TaskCard({
  task,
  showProject = true,
  overlay = false,
}: {
  task: Task
  showProject?: boolean
  overlay?: boolean
}) {
  const updateTask = useUpdateTask()
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
      data-task-id={overlay ? undefined : task.id}
      onClick={isTemp || overlay ? undefined : open}
      onMouseEnter={overlay ? undefined : () => setSelectedTaskId(task.id)}
      className={clsx(
        'flex cursor-default select-none flex-col gap-2 rounded-lg border border-edge bg-raise p-3 transition-colors',
        !overlay && 'hover:border-edge-strong',
        overlay && 'rotate-1 border-edge-strong shadow-2xl shadow-black/50',
        isTemp && 'pointer-events-none opacity-50',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] tabular-nums text-faint">{task.identifier}</span>
        <AvatarStack assignees={task.assignees} size={16} />
      </div>
      <div className="flex items-start gap-2">
        <span className="mt-px shrink-0">
          <StatusSelect
            variant="icon"
            value={task.status}
            onChange={(status) => updateTask.mutate({ id: task.id, patch: { status } })}
          />
        </span>
        <span className="line-clamp-2 min-w-0 text-[13px] font-medium leading-snug text-ink">
          {task.title}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <PrioritySelect
          variant="icon"
          value={task.priority}
          onChange={(priority) => updateTask.mutate({ id: task.id, patch: { priority } })}
        />
        {task.due_date && (
          <span className={clsx('text-[11px] tabular-nums', overdue ? 'text-danger' : 'text-dim')}>
            {formatDueDate(task.due_date)}
          </span>
        )}
        {showProject && task.project && (
          <span className="ml-auto inline-flex min-w-0 items-center gap-1.5 text-[11px] text-dim">
            <ProjectDot color={task.project.color} size={7} />
            <span className="max-w-24 truncate">{task.project.name}</span>
          </span>
        )}
      </div>
    </div>
  )
}
