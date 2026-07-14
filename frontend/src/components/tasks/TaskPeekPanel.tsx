import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { SearchX, Trash2, X } from 'lucide-react'
import type { Task } from '../../api/types'
import { t } from '../../lib/i18n'
import { isOverdue } from '../../lib/date'
import { useDeleteTask, useTask, useUpdateTask } from '../../hooks/useTasks'
import { useUI } from '../../stores/ui'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { StatusSelect } from './properties/StatusSelect'
import { PrioritySelect } from './properties/PrioritySelect'
import { AssigneePicker } from './properties/AssigneePicker'
import { DueDatePicker } from './properties/DueDatePicker'
import { ProjectSelect } from './properties/ProjectSelect'

function TitleEditor({ task }: { task: Task }) {
  const updateTask = useUpdateTask()
  const [title, setTitle] = useState(task.title)
  useEffect(() => setTitle(task.title), [task.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setTitle(task.title)
      return
    }
    if (trimmed !== task.title) {
      updateTask.mutate({ id: task.id, patch: { title: trimmed } })
    }
  }

  return (
    <textarea
      value={title}
      rows={2}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
        if (e.key === 'Escape') e.currentTarget.blur()
      }}
      className="w-full resize-none bg-transparent text-base font-semibold leading-snug text-ink outline-none"
      placeholder={t.task.titlePlaceholder}
    />
  )
}

function DescriptionEditor({ task }: { task: Task }) {
  const updateTask = useUpdateTask()
  const [description, setDescription] = useState(task.description)
  useEffect(() => setDescription(task.description), [task.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => {
    if (description !== task.description) {
      updateTask.mutate({ id: task.id, patch: { description } })
    }
  }

  return (
    <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') e.currentTarget.blur()
      }}
      className="min-h-32 w-full flex-1 resize-none bg-transparent text-[13px] leading-relaxed text-ink outline-none"
      placeholder={t.task.descriptionPlaceholder}
    />
  )
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-dim">{label}</span>
      {children}
    </div>
  )
}

function PanelBody({ taskId, onClose }: { taskId: number; onClose: () => void }) {
  const { data: task, isError, isLoading } = useTask(taskId)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const setSelectedTaskId = useUI((s) => s.setSelectedTaskId)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // パネルで開いているタスクを「選択中」として扱う(S/P/Aショートカット用)
  useEffect(() => {
    setSelectedTaskId(taskId)
  }, [taskId, setSelectedTaskId])

  if (isError || (!task && !isLoading)) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex h-12 items-center justify-end border-b border-edge px-4">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t.actions.close}>
            <X size={15} />
          </Button>
        </div>
        <EmptyState icon={SearchX} title={t.task.notFound} />
      </div>
    )
  }
  if (!task) return null

  const patch = (p: Parameters<typeof updateTask.mutate>[0]['patch']) =>
    updateTask.mutate({ id: task.id, patch: p })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-edge px-4">
        <span className="text-xs tabular-nums text-dim">{task.identifier}</span>
        <span className="ml-auto" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfirmOpen(true)}
          aria-label={t.actions.delete}
        >
          <Trash2 size={15} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t.actions.close}>
          <X size={15} />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        <TitleEditor task={task} />

        <div className="flex flex-col gap-2.5 border-b border-edge/60 pb-4">
          <PropertyRow label={t.fields.status}>
            <StatusSelect value={task.status} onChange={(status) => patch({ status })} />
          </PropertyRow>
          <PropertyRow label={t.fields.priority}>
            <PrioritySelect value={task.priority} onChange={(priority) => patch({ priority })} />
          </PropertyRow>
          <PropertyRow label={t.fields.assignees}>
            <AssigneePicker
              assignees={task.assignees}
              onChange={(assignee_ids) => patch({ assignee_ids })}
            />
          </PropertyRow>
          <PropertyRow label={t.fields.dueDate}>
            <DueDatePicker
              value={task.due_date}
              overdue={isOverdue(task)}
              onChange={(due_date) => patch({ due_date })}
            />
          </PropertyRow>
          <PropertyRow label={t.fields.project}>
            <ProjectSelect value={task.project} onChange={(project_id) => patch({ project_id })} />
          </PropertyRow>
        </div>

        <DescriptionEditor task={task} />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t.task.deleteConfirmTitle}
        body={t.task.deleteConfirmBody}
        onConfirm={() => {
          deleteTask.mutate(task.id)
          onClose()
        }}
      />
    </div>
  )
}

export function TaskPeekPanel() {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('task')
  const taskId = raw != null && /^-?\d+$/.test(raw) ? Number(raw) : null
  const panelRef = useRef<HTMLElement>(null)

  const close = () => {
    setSearchParams((prev) => {
      prev.delete('task')
      return prev
    })
  }

  if (taskId == null || taskId <= 0) return null

  return (
    <aside
      ref={panelRef}
      className="anim-panel flex w-[420px] shrink-0 flex-col border-l border-edge bg-panel"
    >
      <PanelBody key={taskId} taskId={taskId} onClose={close} />
    </aside>
  )
}
