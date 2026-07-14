export type MemberType = 'human' | 'agent'

export type Status = 'backlog' | 'todo' | 'in_progress' | 'done' | 'canceled'

export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

export interface Workspace {
  name: string
  task_prefix: string
}

export interface Member {
  id: number
  name: string
  type: MemberType
  avatar_color: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: number
  name: string
  description: string
  color: string
  icon: string
  task_count: number
  created_at: string
  updated_at: string
}

export interface ProjectRef {
  id: number
  name: string
  color: string
  icon: string
}

export interface AssigneeRef {
  id: number
  name: string
  type: MemberType
  avatar_color: string
}

export interface Task {
  id: number
  number: number
  identifier: string
  title: string
  description: string
  status: Status
  priority: Priority
  due_date: string | null
  project: ProjectRef | null
  assignees: AssigneeRef[]
  sort_order: number
  created_at: string
  updated_at: string
}
