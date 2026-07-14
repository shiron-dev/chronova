import type { Priority, Status } from '../api/types'
import { t } from './i18n'

export const STATUS_ORDER: Status[] = ['backlog', 'todo', 'in_progress', 'done', 'canceled']

export const statusMeta: Record<Status, { label: string; color: string }> = {
  backlog: { label: t.status.backlog, color: '#8b8d93' },
  todo: { label: t.status.todo, color: '#b0b2b8' },
  in_progress: { label: t.status.in_progress, color: '#e8b04b' },
  done: { label: t.status.done, color: '#5e6ad2' },
  canceled: { label: t.status.canceled, color: '#6b6f76' },
}

// メニューでの表示順(Linear準拠: なし → 緊急 → 高 → 中 → 低)
export const PRIORITY_ORDER: Priority[] = ['none', 'urgent', 'high', 'medium', 'low']

export const priorityMeta: Record<Priority, { label: string; color: string }> = {
  urgent: { label: t.priority.urgent, color: '#e5534b' },
  high: { label: t.priority.high, color: '#e8b04b' },
  medium: { label: t.priority.medium, color: '#8b8d93' },
  low: { label: t.priority.low, color: '#8b8d93' },
  none: { label: t.priority.none, color: '#63666d' },
}

export const PROJECT_COLORS = [
  '#5e6ad2',
  '#26b5a6',
  '#4ea7fc',
  '#b694f5',
  '#e0768d',
  '#e8b04b',
  '#95a2b3',
  '#68b665',
]

export const MEMBER_COLORS = [
  '#e0768d',
  '#4ea7fc',
  '#b694f5',
  '#5e6ad2',
  '#26b5a6',
  '#e8b04b',
  '#68b665',
  '#95a2b3',
]
