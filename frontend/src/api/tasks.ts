import { api } from './client'
import type { Priority, Status, Task } from './types'

export interface TaskFilters {
  projectId?: number
  assigneeId?: number
  statuses?: Status[]
  q?: string
}

function filterQuery(f: TaskFilters): string {
  const params = new URLSearchParams()
  if (f.projectId != null) params.set('project_id', String(f.projectId))
  if (f.assigneeId != null) params.set('assignee_id', String(f.assigneeId))
  for (const s of f.statuses ?? []) params.append('status', s)
  if (f.q) params.set('q', f.q)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function listTasks(filters: TaskFilters): Promise<Task[]> {
  const res = await api.get<{ tasks: Task[] }>(`/tasks${filterQuery(filters)}`)
  return res.tasks
}

export function getTask(id: number): Promise<Task> {
  return api.get<Task>(`/tasks/${id}`)
}

export interface CreateTaskInput {
  title: string
  description?: string
  status?: Status
  priority?: Priority
  due_date?: string | null
  project_id?: number | null
  assignee_ids?: number[]
}

export function createTask(input: CreateTaskInput): Promise<Task> {
  return api.post<Task>('/tasks', input)
}

export interface UpdateTaskPatch {
  title?: string
  description?: string
  status?: Status
  priority?: Priority
  due_date?: string | null
  project_id?: number | null
  assignee_ids?: number[]
}

export function updateTask(id: number, patch: UpdateTaskPatch): Promise<Task> {
  return api.patch<Task>(`/tasks/${id}`, patch)
}

export function moveTask(id: number, status: Status, afterId: number | null): Promise<Task> {
  return api.post<Task>(`/tasks/${id}/move`, { status, after_id: afterId })
}

export function deleteTask(id: number): Promise<void> {
  return api.delete(`/tasks/${id}`)
}
