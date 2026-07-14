import type { Task } from '../api/types'

/** 'YYYY-MM-DD' → 'M月D日' */
export function formatDueDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(m)}月${Number(d)}日`
}

function todayString(): string {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

export function isOverdue(task: Pick<Task, 'due_date' | 'status'>): boolean {
  if (!task.due_date) return false
  if (task.status === 'done' || task.status === 'canceled') return false
  return task.due_date < todayString()
}
