import { api } from './client'
import type { Project } from './types'

export async function listProjects(): Promise<Project[]> {
  const res = await api.get<{ projects: Project[] }>('/projects')
  return res.projects
}

export interface ProjectInput {
  name: string
  description?: string
  color?: string
  icon?: string
}

export function createProject(input: ProjectInput): Promise<Project> {
  return api.post<Project>('/projects', input)
}

export function updateProject(id: number, patch: Partial<ProjectInput>): Promise<Project> {
  return api.patch<Project>(`/projects/${id}`, patch)
}

export function deleteProject(id: number): Promise<void> {
  return api.delete(`/projects/${id}`)
}
