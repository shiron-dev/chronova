import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type { Member, Project, Status, Task } from '../api/types'
import * as tasksApi from '../api/tasks'
import { keys } from '../lib/queryKeys'
import { t } from '../lib/i18n'
import { computeInsertRank, endOfColumnRank as endOfColumnRankPure } from '../lib/rank'
import {
  applyTaskPatch,
  buildTempTask,
  taskMatchesFilter,
  type ListFilterKey,
} from '../lib/optimistic'
import { useUI } from '../stores/ui'

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
  return endOfColumnRankPure(collectCachedTasks(qc), status)
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
      patchCaches(qc, (task) =>
        task.id === id ? applyTaskPatch(task, patch, { members, projects, bottomRank }) : task,
      )
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
      const columnTasks = collectCachedTasks(qc).filter((task) => task.status === status)
      const rank = computeInsertRank(columnTasks, afterId, id)
      patchCaches(qc, (task) => (task.id === id ? { ...task, status, sort_order: rank } : task))
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
      const temp = buildTempTask(input, {
        members,
        projects,
        tempId: tempIdSeq--,
        sortOrder: endOfColumnRank(qc, status),
        nowIso: new Date().toISOString(),
      })
      // フィルタ条件に合致するリストキャッシュにだけ楽観挿入する
      for (const [key, data] of qc.getQueriesData<CacheData>({ queryKey: keys.tasks.all })) {
        if (!Array.isArray(data)) continue
        const filter = key[2] as ListFilterKey | undefined
        if (!filter || typeof filter !== 'object') continue
        if (!taskMatchesFilter(temp, filter)) continue
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
