import type { TaskFilters } from '../api/tasks'

export const keys = {
  workspace: ['workspace'] as const,
  members: ['members'] as const,
  projects: ['projects'] as const,
  tasks: {
    all: ['tasks'] as const,
    list: (f: TaskFilters) =>
      ['tasks', 'list', { projectId: f.projectId ?? null, assigneeId: f.assigneeId ?? null }] as const,
    detail: (id: number) => ['tasks', 'detail', id] as const,
  },
}
