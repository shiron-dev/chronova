import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatDueDate, isOverdue } from './date'

describe('formatDueDate', () => {
  it('ゼロ埋めを外して M月D日 に整形する', () => {
    expect(formatDueDate('2026-07-05')).toBe('7月5日')
    expect(formatDueDate('2026-12-31')).toBe('12月31日')
    expect(formatDueDate('2026-01-01')).toBe('1月1日')
  })
})

describe('isOverdue', () => {
  beforeEach(() => {
    // 「今日」を 2026-07-14 に固定
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-14T09:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('過去の期限かつ未完了なら true', () => {
    expect(isOverdue({ due_date: '2026-07-13', status: 'todo' })).toBe(true)
    expect(isOverdue({ due_date: '2026-07-13', status: 'in_progress' })).toBe(true)
  })

  it('当日・未来の期限は false', () => {
    expect(isOverdue({ due_date: '2026-07-14', status: 'todo' })).toBe(false)
    expect(isOverdue({ due_date: '2026-07-15', status: 'todo' })).toBe(false)
  })

  it('done / canceled は過去でも false', () => {
    expect(isOverdue({ due_date: '2026-07-01', status: 'done' })).toBe(false)
    expect(isOverdue({ due_date: '2026-07-01', status: 'canceled' })).toBe(false)
  })

  it('期限なしは false', () => {
    expect(isOverdue({ due_date: null, status: 'todo' })).toBe(false)
  })
})
