import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type { AssigneeRef, Member, Project, Status, Task } from '../api/types'
import * as tasksApi from '../api/tasks'
import { keys } from '../lib/queryKeys'
import { t } from '../lib/i18n'
import { useUI } from '../stores/ui'

const RANK_STEP = 1024

// キャッシュは Task[](リスト)と Task(詳細)の2形態を持つ
type CacheData = Task[] | Task | undefined

export function useTasksList(filters: tasksApi.TaskFilters) {
  return useQuery({
    queryKey: keys.tasks.list(filters),
    queryFn: () => tasksApi.listTasks(filters),
  })
}

export function useTask(id: number | null) {
  const qc = useQueryClient()
  return useQuery({
    queryKey: keys.tasks.detail(id ?? -1),
    queryFn: () => tasksApi.getTask(id as number),
    enabled: id != null && id > 0,
    placeholderData: () => (id != null ? findTaskInCaches(qc, id) : undefined),
  })
}

export function collectCachedTasks(qc: QueryClient): Task[] {
  const byId = new Map<number, Task>()
  for (const [, data] of qc.getQueriesData<CacheData>({ queryKey: keys.tasks.all })) {
    if (Array.isArray(data)) {
      for (const task of data) byId.set(task.id, task)
    } else if (data && typeof data === 'object' && 'id' in data) {
      byId.set(data.id, data)
    }
  }
  return [...byId.values()]
}

export function findTaskInCaches(qc: QueryClient, id: number): Task | undefined {
  return collectCachedTasks(qc).find((task) => task.id === id)
}

/** 全タスクキャッシュへ変換を適用する(null を返すとリストから除去) */
function patchCaches(qc: QueryClient, fn: (task: Task) => Task | null) {
  qc.setQueriesData<CacheData>({ queryKey: keys.tasks.all }, (data) => {
    if (Array.isArray(data)) {
      return data.flatMap((task) => {
        const next = fn(task)
        return next ? [next] : []
      })
    }
    if (data && typeof data === 'object' && 'id' in data) {
      return fn(data) ?? data
    }
    return data
  })
}

type Snapshot = ReturnType<QueryClient['getQueriesData']>

function snapshot(qc: QueryClient): Snapshot {
  return qc.getQueriesData<CacheData>({ queryKey: keys.tasks.all })
}

function restore(qc: QueryClient, snap: Snapshot) {
  for (const [key, data] of snap) qc.setQueryData(key, data)
}

function endOfColumnRank(qc: QueryClient, status: Status): number {
  const column = collectCachedTasks(qc).filter((task) => task.status === status)
  return column.reduce((max, task) => Math.max(max, task.sort_order), 0) + RANK_STEP
}

function toProjectRef(projects: Project[], id: number | null | undefined) {
  if (id == null) return null
  const p = projects.find((x) => x.id === id)
  return p ? { id: p.id, name: p.name, color: p.color, icon: p.icon } : null
}

function toAssignees(members: Member[], ids: number[]): AssigneeRef[] {
  return ids.flatMap((id) => {
    const m = members.find((x) => x.id === id)
    return m ? [{ id: m.id, name: m.name, type: m.type, avatar_color: m.avatar_color }] : []
  })
}

export interface UpdateTaskVars {
  id: number
  patch: tasksApi.UpdateTaskPatch
}

export function useUpdateTask() {
  const qc = useQueryClient()
  const pushToast = useUI((s) => s.pushToast)
  return useMutation({
    mutationFn: ({ id, patch }: UpdateTaskVars) => tasksApi.updateTask(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.tasks.all })
      const snap = snapshot(qc)
      const members = qc.getQueryData<Member[]>(keys.members) ?? []
      const projects = qc.getQueryData<Project[]>(keys.projects) ?? []
      const bottomRank = patch.status != null ? endOfColumnRank(qc, patch.status) : 0
      patchCaches(qc, (task) => {
        if (task.id !== id) return task
        const next: Task = { ...task }
        if (patch.title !== undefined) next.title = patch.title
        if (patch.description !== undefined) next.description = patch.description
        if (patch.priority !== undefined) next.priority = patch.priority
        if (patch.status !== undefined && patch.status !== task.status) {
          next.status = patch.status
          next.sort_order = bottomRank
        }
        if (patch.due_date !== undefined) next.due_date = patch.due_date
        if (patch.project_id !== undefined) next.project = toProjectRef(projects, patch.project_id)
        if (patch.assignee_ids !== undefined) next.assignees = toAssignees(members, patch.assignee_ids)
        return next
      })
      return { snap }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restore(qc, ctx.snap)
      pushToast(t.toast.updateFailed)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.tasks.all })
      qc.invalidateQueries({ queryKey: keys.projects })
    },
  })
}

export interface MoveTaskVars {
  id: number
  status: Status
  afterId: number | null
}

export function useMoveTask() {
  const qc = useQueryClient()
  const pushToast = useUI((s) => s.pushToast)
  return useMutation({
    mutationFn: ({ id, status, afterId }: MoveTaskVars) => tasksApi.moveTask(id, status, afterId),
    onMutate: async ({ id, status, afterId }) => {
      await qc.cancelQueries({ queryKey: keys.tasks.all })
      const snap = snapshot(qc)
      // ドロップ位置の中点rankをローカル計算してフリッカーなく並べ替える
      const column = collectCachedTasks(qc)
        .filter((task) => task.status === status && task.id !== id)
        .sort((a, b) => a.sort_order - b.sort_order)
      let rank: number
      if (afterId == null) {
        rank = column.length > 0 ? column[0].sort_order - RANK_STEP : RANK_STEP
      } else {
        const idx = column.findIndex((task) => task.id === afterId)
        if (idx === -1) {
          rank = (column[column.length - 1]?.sort_order ?? 0) + RANK_STEP
        } else {
          const prev = column[idx].sort_order
          const next = column[idx + 1]?.sort_order
          rank = next === undefined ? prev + RANK_STEP : (prev + next) / 2
        }
      }
      patchCaches(qc, (task) =>
        task.id === id ? { ...task, status, sort_order: rank } : task,
      )
      return { snap }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restore(qc, ctx.snap)
      pushToast(t.toast.updateFailed)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.tasks.all })
    },
  })
}

let tempIdSeq = -1

export function useCreateTask() {
  const qc = useQueryClient()
  const pushToast = useUI((s) => s.pushToast)
  return useMutation({
    mutationFn: (input: tasksApi.CreateTaskInput) => tasksApi.createTask(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.tasks.all })
      const snap = snapshot(qc)
      const members = qc.getQueryData<Member[]>(keys.members) ?? []
      const projects = qc.getQueryData<Project[]>(keys.projects) ?? []
      const status: Status = input.status ?? 'todo'
      const nowIso = new Date().toISOString()
      const temp: Task = {
        id: tempIdSeq--,
        number: 0,
        identifier: '…',
        title: input.title,
        description: input.description ?? '',
        status,
        priority: input.priority ?? 'none',
        due_date: input.due_date ?? null,
        project: toProjectRef(projects, input.project_id),
        assignees: toAssignees(members, input.assignee_ids ?? []),
        sort_order: endOfColumnRank(qc, status),
        created_at: nowIso,
        updated_at: nowIso,
      }
      // フィルタ条件に合致するリストキャッシュにだけ楽観挿入する
      for (const [key, data] of qc.getQueriesData<CacheData>({ queryKey: keys.tasks.all })) {
        if (!Array.isArray(data)) continue
        const filter = key[2] as { projectId: number | null; assigneeId: number | null } | undefined
        if (!filter || typeof filter !== 'object') continue
        if (filter.projectId != null && temp.project?.id !== filter.projectId) continue
        if (filter.assigneeId != null && !temp.assignees.some((a) => a.id === filter.assigneeId)) continue
        qc.setQueryData(key, [...data, temp])
      }
      return { snap }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restore(qc, ctx.snap)
      pushToast(t.toast.createFailed)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.tasks.all })
      qc.invalidateQueries({ queryKey: keys.projects })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  const pushToast = useUI((s) => s.pushToast)
  return useMutation({
    mutationFn: (id: number) => tasksApi.deleteTask(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.tasks.all })
      const snap = snapshot(qc)
      patchCaches(qc, (task) => (task.id === id ? null : task))
      return { snap }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restore(qc, ctx.snap)
      pushToast(t.toast.deleteFailed)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.tasks.all })
      qc.invalidateQueries({ queryKey: keys.projects })
    },
  })
}
