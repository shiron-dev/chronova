import type { Member, Project, Task } from '../api/types'

export function makeMember(over: Partial<Member> = {}): Member {
  return {
    id: 1,
    name: '佐藤 花子',
    type: 'human',
    avatar_color: '#E0768D',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...over,
  }
}

export function makeProject(over: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: 'ウェブサイトリニューアル',
    description: '',
    color: '#5E6AD2',
    icon: 'globe',
    task_count: 0,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...over,
  }
}

export function makeTask(over: Partial<Task> = {}): Task {
  return {
    id: 1,
    number: 1,
    identifier: 'CHR-1',
    title: 'サンプルタスク',
    description: '',
    status: 'todo',
    priority: 'none',
    due_date: null,
    project: null,
    assignees: [],
    sort_order: 1024,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...over,
  }
}
