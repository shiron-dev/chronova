import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import {
  Box,
  Check,
  Columns3,
  ExternalLink,
  Inbox,
  List,
  Plus,
  Trash2,
  UserCircle,
  Users,
} from 'lucide-react'
import { t } from '../../lib/i18n'
import { PRIORITY_ORDER, STATUS_ORDER, priorityMeta, statusMeta } from '../../lib/labels'
import { useDeleteTask, useTask, useUpdateTask } from '../../hooks/useTasks'
import { useProjectsList } from '../../hooks/useProjects'
import { useMembersList } from '../../hooks/useMembers'
import { useUI } from '../../stores/ui'
import { Dialog, DialogContent, DialogTitle } from '../ui/Dialog'
import { StatusIcon } from '../tasks/StatusIcon'
import { PriorityIcon } from '../tasks/PriorityIcon'
import { ProjectDot } from '../tasks/properties/ProjectSelect'
import { MemberAvatar } from '../members/MemberAvatar'

const itemClass =
  'flex cursor-default select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-ink data-[selected=true]:bg-hover'

function GroupHeading({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] text-dim">{children}</span>
}

export function CommandPalette() {
  const paletteOpen = useUI((s) => s.paletteOpen)
  const palettePage = useUI((s) => s.palettePage)
  const setPalettePage = useUI((s) => s.setPalettePage)
  const closePalette = useUI((s) => s.closePalette)
  const openNewTask = useUI((s) => s.openNewTask)
  const openNewProject = useUI((s) => s.openNewProject)
  const selectedTaskId = useUI((s) => s.selectedTaskId)

  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: projects = [] } = useProjectsList()
  const { data: members = [] } = useMembersList()
  const { data: task } = useTask(paletteOpen ? selectedTaskId : null)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [search, setSearch] = useState('')
  useEffect(() => {
    if (paletteOpen) setSearch('')
  }, [paletteOpen, palettePage])

  const onTaskPage = location.pathname !== '/members'

  const goto = (path: string) => {
    navigate(path)
    closePalette()
  }

  const openSelectedTask = () => {
    if (!task) return
    setSearchParams((prev) => {
      prev.set('task', String(task.id))
      return prev
    })
    closePalette()
  }

  const removeSelectedTask = () => {
    if (!task) return
    deleteTask.mutate(task.id)
    if (searchParams.get('task') === String(task.id)) {
      setSearchParams((prev) => {
        prev.delete('task')
        return prev
      })
    }
    closePalette()
  }

  const setView = (view: 'list' | 'board') => {
    setSearchParams((prev) => {
      prev.set('view', view)
      return prev
    })
    closePalette()
  }

  return (
    <Dialog open={paletteOpen} onOpenChange={(o) => !o && closePalette()}>
      <DialogContent className="top-[12%] w-[620px] overflow-hidden p-0">
        <DialogTitle className="sr-only">{t.palette.placeholder}</DialogTitle>
        <Command loop>
          {palettePage !== 'root' && task && (
            <div className="flex items-center gap-2 border-b border-edge px-4 pt-3 pb-2">
              <span className="rounded bg-active px-1.5 py-0.5 text-[11px] text-dim">
                {task.identifier}
              </span>
              <span className="truncate text-xs text-dim">{task.title}</span>
            </div>
          )}
          <Command.Input
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder={t.palette.placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && search === '' && palettePage !== 'root') {
                e.preventDefault()
                setPalettePage('root')
              }
            }}
            className="h-12 w-full border-b border-edge bg-transparent px-4 text-sm text-ink outline-none"
          />
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty>
              <p className="px-2.5 py-6 text-center text-[13px] text-dim">{t.palette.noResults}</p>
            </Command.Empty>

            {palettePage === 'root' && (
              <>
                {task && (
                  <Command.Group
                    heading={<GroupHeading>{`${t.palette.taskSection}: ${task.identifier}`}</GroupHeading>}
                  >
                    <Command.Item className={itemClass} onSelect={() => setPalettePage('status')}>
                      <StatusIcon status={task.status} />
                      {t.palette.changeStatus}
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={() => setPalettePage('priority')}>
                      <PriorityIcon priority={task.priority} />
                      {t.palette.changePriority}
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={() => setPalettePage('assignee')}>
                      <Users size={14} className="text-dim" />
                      {t.palette.changeAssignees}
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={openSelectedTask}>
                      <ExternalLink size={14} className="text-dim" />
                      {t.palette.openTask}
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={removeSelectedTask}>
                      <Trash2 size={14} className="text-danger" />
                      <span className="text-danger">{t.palette.deleteTask}</span>
                    </Command.Item>
                  </Command.Group>
                )}

                <Command.Group heading={<GroupHeading>{t.palette.navigation}</GroupHeading>}>
                  <Command.Item className={itemClass} onSelect={() => goto('/tasks')}>
                    <Inbox size={14} className="text-dim" />
                    {t.nav.allTasks}
                  </Command.Item>
                  <Command.Item className={itemClass} onSelect={() => goto('/my')}>
                    <UserCircle size={14} className="text-dim" />
                    {t.nav.myTasks}
                  </Command.Item>
                  <Command.Item className={itemClass} onSelect={() => goto('/members')}>
                    <Users size={14} className="text-dim" />
                    {t.nav.members}
                  </Command.Item>
                  {projects.map((project) => (
                    <Command.Item
                      key={project.id}
                      className={itemClass}
                      value={`${t.nav.projects} ${project.name}`}
                      onSelect={() => goto(`/projects/${project.id}`)}
                    >
                      <ProjectDot color={project.color} />
                      {project.name}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading={<GroupHeading>{t.palette.createSection}</GroupHeading>}>
                  <Command.Item
                    className={itemClass}
                    onSelect={() => {
                      closePalette()
                      openNewTask()
                    }}
                  >
                    <Plus size={14} className="text-dim" />
                    {t.actions.newTask}
                  </Command.Item>
                  <Command.Item
                    className={itemClass}
                    onSelect={() => {
                      closePalette()
                      openNewProject()
                    }}
                  >
                    <Box size={14} className="text-dim" />
                    {t.actions.newProject}
                  </Command.Item>
                </Command.Group>

                {onTaskPage && (
                  <Command.Group heading={<GroupHeading>{t.palette.viewSection}</GroupHeading>}>
                    <Command.Item className={itemClass} onSelect={() => setView('list')}>
                      <List size={14} className="text-dim" />
                      {t.palette.switchToList}
                    </Command.Item>
                    <Command.Item className={itemClass} onSelect={() => setView('board')}>
                      <Columns3 size={14} className="text-dim" />
                      {t.palette.switchToBoard}
                    </Command.Item>
                  </Command.Group>
                )}
              </>
            )}

            {palettePage === 'status' && task && (
              <Command.Group heading={<GroupHeading>{t.fields.status}</GroupHeading>}>
                {STATUS_ORDER.map((status) => (
                  <Command.Item
                    key={status}
                    className={itemClass}
                    onSelect={() => {
                      updateTask.mutate({ id: task.id, patch: { status } })
                      closePalette()
                    }}
                  >
                    <StatusIcon status={status} />
                    <span className="flex-1">{statusMeta[status].label}</span>
                    {task.status === status && <Check size={14} className="text-accent" />}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {palettePage === 'priority' && task && (
              <Command.Group heading={<GroupHeading>{t.fields.priority}</GroupHeading>}>
                {PRIORITY_ORDER.map((priority) => (
                  <Command.Item
                    key={priority}
                    className={itemClass}
                    onSelect={() => {
                      updateTask.mutate({ id: task.id, patch: { priority } })
                      closePalette()
                    }}
                  >
                    <PriorityIcon priority={priority} />
                    <span className="flex-1">{priorityMeta[priority].label}</span>
                    {task.priority === priority && <Check size={14} className="text-accent" />}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {palettePage === 'assignee' && task && (
              <Command.Group heading={<GroupHeading>{t.fields.assignees}</GroupHeading>}>
                {members.map((member) => {
                  const ids = task.assignees.map((a) => a.id)
                  const assigned = ids.includes(member.id)
                  return (
                    <Command.Item
                      key={member.id}
                      className={itemClass}
                      value={`${member.name} ${t.memberType[member.type]}`}
                      onSelect={() => {
                        updateTask.mutate({
                          id: task.id,
                          patch: {
                            assignee_ids: assigned
                              ? ids.filter((x) => x !== member.id)
                              : [...ids, member.id],
                          },
                        })
                      }}
                    >
                      <MemberAvatar member={member} size={18} />
                      <span className="flex-1 truncate">{member.name}</span>
                      <span className="text-[10px] text-faint">{t.memberType[member.type]}</span>
                      {assigned && <Check size={14} className="text-accent" />}
                    </Command.Item>
                  )
                })}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
