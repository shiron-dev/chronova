import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as projectsApi from '../api/projects'
import { keys } from '../lib/queryKeys'
import { t } from '../lib/i18n'
import { useUI } from '../stores/ui'

export function useProjectsList() {
  return useQuery({ queryKey: keys.projects, queryFn: projectsApi.listProjects })
}

function useInvalidateProjects() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: keys.projects })
    // タスクにプロジェクト情報が埋め込まれているため合わせて更新
    qc.invalidateQueries({ queryKey: keys.tasks.all })
  }
}

export function useCreateProject() {
  const invalidate = useInvalidateProjects()
  const pushToast = useUI((s) => s.pushToast)
  return useMutation({
    mutationFn: (input: projectsApi.ProjectInput) => projectsApi.createProject(input),
    onError: () => pushToast(t.toast.createFailed),
    onSettled: invalidate,
  })
}

export function useUpdateProject() {
  const invalidate = useInvalidateProjects()
  const pushToast = useUI((s) => s.pushToast)
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<projectsApi.ProjectInput> }) =>
      projectsApi.updateProject(id, patch),
    onError: () => pushToast(t.toast.updateFailed),
    onSettled: invalidate,
  })
}

export function useDeleteProject() {
  const invalidate = useInvalidateProjects()
  const pushToast = useUI((s) => s.pushToast)
  return useMutation({
    mutationFn: (id: number) => projectsApi.deleteProject(id),
    onError: () => pushToast(t.toast.deleteFailed),
    onSettled: invalidate,
  })
}
