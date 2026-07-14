import { useState } from 'react'
import type { Priority, Status } from '../../api/types'
import { t } from '../../lib/i18n'
import { useCreateTask } from '../../hooks/useTasks'
import { useMembersList } from '../../hooks/useMembers'
import { useProjectsList } from '../../hooks/useProjects'
import { useUI, type NewTaskDefaults } from '../../stores/ui'
import { Dialog, DialogContent, DialogTitle } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Kbd } from '../ui/Kbd'
import { StatusSelect } from './properties/StatusSelect'
import { PrioritySelect } from './properties/PrioritySelect'
import { AssigneePicker } from './properties/AssigneePicker'
import { DueDatePicker } from './properties/DueDatePicker'
import { ProjectSelect } from './properties/ProjectSelect'

function NewTaskForm({ defaults, onDone }: { defaults: NewTaskDefaults; onDone: () => void }) {
  const createTask = useCreateTask()
  const { data: members = [] } = useMembersList()
  const { data: projects = [] } = useProjectsList()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>(defaults.status ?? 'todo')
  const [priority, setPriority] = useState<Priority>('none')
  const [assigneeIds, setAssigneeIds] = useState<number[]>([])
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<number | null>(defaults.projectId ?? null)

  const project = projects.find((p) => p.id === projectId) ?? null
  const assignees = assigneeIds.flatMap((id) => {
    const m = members.find((x) => x.id === id)
    return m ? [{ id: m.id, name: m.name, type: m.type, avatar_color: m.avatar_color }] : []
  })

  const canSubmit = title.trim().length > 0

  const submit = () => {
    if (!canSubmit) return
    createTask.mutate({
      title: title.trim(),
      description: description || undefined,
      status,
      priority,
      due_date: dueDate,
      project_id: projectId,
      assignee_ids: assigneeIds,
    })
    onDone()
  }

  const onFormKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex flex-col" onKeyDown={onFormKeyDown}>
      <div className="flex flex-col gap-2 px-5 pt-4">
        <DialogTitle className="sr-only">{t.actions.newTask}</DialogTitle>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={t.task.titlePlaceholder}
          className="w-full bg-transparent text-base font-semibold text-ink outline-none"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.task.descriptionPlaceholder}
          className="min-h-20 w-full resize-none bg-transparent text-[13px] leading-relaxed text-ink outline-none"
        />
        <div className="flex flex-wrap items-center gap-2 pb-4">
          <StatusSelect value={status} onChange={setStatus} />
          <PrioritySelect value={priority} onChange={setPriority} />
          <AssigneePicker assignees={assignees} onChange={setAssigneeIds} />
          <DueDatePicker value={dueDate} onChange={setDueDate} />
          <ProjectSelect
            value={project ? { id: project.id, name: project.name, color: project.color, icon: project.icon } : null}
            onChange={setProjectId}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-edge px-5 py-3">
        <span className="flex items-center gap-1 text-xs text-faint">
          <Kbd>⌘</Kbd>
          <Kbd>Enter</Kbd>
        </span>
        <Button variant="primary" size="sm" disabled={!canSubmit} onClick={submit}>
          {t.actions.create}
        </Button>
      </div>
    </div>
  )
}

export function NewTaskModal() {
  const open = useUI((s) => s.newTaskOpen)
  const defaults = useUI((s) => s.newTaskDefaults)
  const closeNewTask = useUI((s) => s.closeNewTask)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeNewTask()}>
      <DialogContent>
        <NewTaskForm defaults={defaults} onDone={closeNewTask} />
      </DialogContent>
    </Dialog>
  )
}
