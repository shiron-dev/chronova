import { useState } from 'react'
import { Check } from 'lucide-react'
import { clsx } from 'clsx'
import type { Project } from '../../api/types'
import { t } from '../../lib/i18n'
import { PROJECT_COLORS } from '../../lib/labels'
import { useCreateProject, useUpdateProject } from '../../hooks/useProjects'
import { Dialog, DialogContent, DialogTitle } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { Input, Textarea } from '../ui/Input'

export function ColorSwatches({
  colors,
  value,
  onChange,
}: {
  colors: string[]
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          className={clsx(
            'flex h-6 w-6 items-center justify-center rounded-md transition-transform hover:scale-110',
          )}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          aria-label={color}
        >
          {value === color && <Check size={13} className="text-white" />}
        </button>
      ))}
    </div>
  )
}

function ProjectForm({ project, onDone }: { project?: Project; onDone: () => void }) {
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0])

  const canSubmit = name.trim().length > 0

  const submit = () => {
    if (!canSubmit) return
    const input = { name: name.trim(), description, color }
    if (project) {
      updateProject.mutate({ id: project.id, patch: input })
    } else {
      createProject.mutate(input)
    }
    onDone()
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <DialogTitle>{project ? t.project.editTitle : t.actions.newProject}</DialogTitle>
      <div className="flex flex-col gap-3">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit()
          }}
          placeholder={t.project.namePlaceholder}
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.project.descriptionPlaceholder}
          rows={3}
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-dim">{t.fields.color}</span>
          <ColorSwatches colors={PROJECT_COLORS} value={color} onChange={setColor} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>
          {t.actions.cancel}
        </Button>
        <Button variant="primary" size="sm" disabled={!canSubmit} onClick={submit}>
          {project ? t.actions.save : t.actions.create}
        </Button>
      </div>
    </div>
  )
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[460px]">
        <ProjectForm project={project} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
