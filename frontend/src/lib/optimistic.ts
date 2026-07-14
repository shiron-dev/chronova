import type { AssigneeRef, Member, Project, ProjectRef, Status, Task } from '../api/types'
import type { CreateTaskInput, UpdateTaskPatch } from '../api/tasks'

export function toProjectRef(projects: Project[], id: number | null | undefined): ProjectRef | null {
  if (id == null) return null
  const p = projects.find((x) => x.id === id)
  return p ? { id: p.id, name: p.name, color: p.color, icon: p.icon } : null
}

export function toAssignees(members: Member[], ids: number[]): AssigneeRef[] {
  return ids.flatMap((id) => {
    const m = members.find((x) => x.id === id)
    return m ? [{ id: m.id, name: m.name, type: m.type, avatar_color: m.avatar_color }] : []
  })
}

export interface PatchContext {
  members: Member[]
  projects: Project[]
  // status が変わるときに使う移動先カラム末尾のrank
  bottomRank: number
}

/**
 * タスクにPATCHを楽観適用した新しいTaskを返す(純粋関数)。
 * status変更時は sort_order を移動先カラム末尾へ更新する。
 */
export function applyTaskPatch(task: Task, patch: UpdateTaskPatch, ctx: PatchContext): Task {
  const next: Task = { ...task }
  if (patch.title !== undefined) next.title = patch.title
  if (patch.description !== undefined) next.description = patch.description
  if (patch.priority !== undefined) next.priority = patch.priority
  if (patch.status !== undefined && patch.status !== task.status) {
    next.status = patch.status
    next.sort_order = ctx.bottomRank
  }
  if (patch.due_date !== undefined) next.due_date = patch.due_date
  if (patch.project_id !== undefined) next.project = toProjectRef(ctx.projects, patch.project_id)
  if (patch.assignee_ids !== undefined) next.assignees = toAssignees(ctx.members, patch.assignee_ids)
  return next
}

export interface TempTaskContext {
  members: Member[]
  projects: Project[]
  tempId: number
  sortOrder: number
  nowIso: string
}

/** 楽観挿入用の一時タスク(負ID・identifier プレースホルダ)を組み立てる。 */
export function buildTempTask(input: CreateTaskInput, ctx: TempTaskContext): Task {
  const status: Status = input.status ?? 'todo'
  return {
    id: ctx.tempId,
    number: 0,
    identifier: '…',
    title: input.title,
    description: input.description ?? '',
    status,
    priority: input.priority ?? 'none',
    due_date: input.due_date ?? null,
    project: toProjectRef(ctx.projects, input.project_id),
    assignees: toAssignees(ctx.members, input.assignee_ids ?? []),
    sort_order: ctx.sortOrder,
    created_at: ctx.nowIso,
    updated_at: ctx.nowIso,
  }
}

export interface ListFilterKey {
  projectId: number | null
  assigneeId: number | null
}

/** タスクが指定のリストフィルタ(project/assignee)に合致するか。 */
export function taskMatchesFilter(task: Task, filter: ListFilterKey): boolean {
  if (filter.projectId != null && task.project?.id !== filter.projectId) return false
  if (filter.assigneeId != null && !task.assignees.some((a) => a.id === filter.assigneeId)) return false
  return true
}
