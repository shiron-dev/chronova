import { useState } from 'react'
import { NavLink } from 'react-router'
import {
  Check,
  ChevronsUpDown,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { Project } from '../../api/types'
import { t } from '../../lib/i18n'
import { useProjectsList, useDeleteProject } from '../../hooks/useProjects'
import { useMembersList } from '../../hooks/useMembers'
import { useUI } from '../../stores/ui'
import { Kbd } from '../ui/Kbd'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu'
import { MemberAvatar } from '../members/MemberAvatar'
import { ProjectDot } from '../tasks/properties/ProjectSelect'
import { ProjectFormDialog } from '../projects/ProjectFormDialog'

function SideLink({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors',
          isActive ? 'bg-active text-ink' : 'text-dim hover:bg-hover hover:text-ink',
        )
      }
    >
      <Icon size={15} />
      {label}
    </NavLink>
  )
}

function ProjectItem({ project }: { project: Project }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteProject = useDeleteProject()

  return (
    <div className="group relative" data-testid="project-item">
      <NavLink
        to={`/projects/${project.id}`}
        className={({ isActive }) =>
          clsx(
            'flex h-8 items-center gap-2.5 rounded-md px-2.5 pr-8 text-[13px] transition-colors',
            isActive ? 'bg-active text-ink' : 'text-dim hover:bg-hover hover:text-ink',
          )
        }
      >
        <ProjectDot color={project.color} />
        <span className="min-w-0 flex-1 truncate">{project.name}</span>
        <span className="text-[11px] tabular-nums text-faint">{project.task_count}</span>
      </NavLink>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-dim opacity-0 transition-opacity hover:bg-active hover:text-ink focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label={t.actions.edit}
          >
            <MoreHorizontal size={13} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil size={13} className="text-dim" />
            {t.actions.edit}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDeleteOpen(true)}>
            <Trash2 size={13} className="text-danger" />
            <span className="text-danger">{t.actions.delete}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t.project.deleteConfirmTitle}
        body={t.project.deleteConfirmBody}
        onConfirm={() => deleteProject.mutate(project.id)}
      />
    </div>
  )
}

function MemberSwitcher() {
  const { data: members = [] } = useMembersList()
  const currentMemberId = useUI((s) => s.currentMemberId)
  const setCurrentMemberId = useUI((s) => s.setCurrentMemberId)
  const current = members.find((m) => m.id === currentMemberId) ?? null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-hover">
          {current ? (
            <MemberAvatar member={current} size={22} />
          ) : (
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-active">
              <UserCircle size={14} className="text-dim" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">
              {current ? current.name : t.member.actingAs}
            </span>
            <span className="block text-[10px] text-faint">
              {current ? t.memberType[current.type] : '未選択'}
            </span>
          </span>
          <ChevronsUpDown size={13} className="shrink-0 text-faint" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" className="w-56">
        <DropdownMenuLabel>{t.member.actingAs}</DropdownMenuLabel>
        {members.map((member) => (
          <DropdownMenuItem key={member.id} onSelect={() => setCurrentMemberId(member.id)}>
            <MemberAvatar member={member} size={18} />
            <span className="min-w-0 flex-1 truncate">{member.name}</span>
            <span className="text-[10px] text-faint">{t.memberType[member.type]}</span>
            {member.id === currentMemberId && <Check size={13} className="text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Sidebar() {
  const { data: projects = [] } = useProjectsList()
  const openNewTask = useUI((s) => s.openNewTask)
  const openNewProject = useUI((s) => s.openNewProject)

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-edge bg-panel">
      <div className="flex h-13 items-center gap-2.5 px-4 pt-1">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#7c88e8] to-accent text-[13px] font-bold text-white">
          C
        </span>
        <span className="text-sm font-semibold tracking-tight">{t.app.name}</span>
      </div>

      <div className="px-3 pb-2 pt-2">
        <Button
          variant="primary"
          size="sm"
          className="w-full justify-between"
          onClick={() => openNewTask()}
        >
          <span className="flex items-center gap-1.5">
            <Plus size={13} />
            {t.actions.newTask}
          </span>
          <Kbd className="border-white/20 bg-white/10 text-white/70">C</Kbd>
        </Button>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        <SideLink to="/tasks" icon={Inbox} label={t.nav.allTasks} />
        <SideLink to="/my" icon={UserCircle} label={t.nav.myTasks} />
        <SideLink to="/members" icon={Users} label={t.nav.members} />
      </nav>

      <div className="mt-5 flex min-h-0 flex-1 flex-col px-3">
        <div className="flex h-6 items-center px-2.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
            {t.nav.projects}
          </span>
          <button
            className="ml-auto flex h-5 w-5 items-center justify-center rounded text-dim hover:bg-active hover:text-ink"
            onClick={openNewProject}
            aria-label={t.actions.newProject}
          >
            <Plus size={13} />
          </button>
        </div>
        <div className="flex flex-col gap-0.5 overflow-y-auto pb-2">
          {projects.map((project) => (
            <ProjectItem key={project.id} project={project} />
          ))}
          {projects.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-faint">{t.empty.noProjects}</p>
          )}
        </div>
      </div>

      <div className="border-t border-edge p-2">
        <MemberSwitcher />
      </div>
    </aside>
  )
}
