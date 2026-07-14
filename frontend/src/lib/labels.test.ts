import { describe, expect, it } from 'vitest'
import type { Priority, Status } from '../api/types'
import {
  PRIORITY_ORDER,
  STATUS_ORDER,
  priorityMeta,
  statusMeta,
} from './labels'

const ALL_STATUSES: Status[] = ['backlog', 'todo', 'in_progress', 'done', 'canceled']
const ALL_PRIORITIES: Priority[] = ['none', 'low', 'medium', 'high', 'urgent']

describe('labels', () => {
  it('STATUS_ORDER は全ステータスを重複なく含む', () => {
    expect([...STATUS_ORDER].sort()).toEqual([...ALL_STATUSES].sort())
    expect(new Set(STATUS_ORDER).size).toBe(STATUS_ORDER.length)
  })

  it('PRIORITY_ORDER は全優先度を重複なく含む', () => {
    expect([...PRIORITY_ORDER].sort()).toEqual([...ALL_PRIORITIES].sort())
    expect(new Set(PRIORITY_ORDER).size).toBe(PRIORITY_ORDER.length)
  })

  it('全ステータスに label と color の meta がある', () => {
    for (const s of ALL_STATUSES) {
      expect(statusMeta[s].label).toBeTruthy()
      expect(statusMeta[s].color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('全優先度に label と color の meta がある', () => {
    for (const p of ALL_PRIORITIES) {
      expect(priorityMeta[p].label).toBeTruthy()
      expect(priorityMeta[p].color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})
