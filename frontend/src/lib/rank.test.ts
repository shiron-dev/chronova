import { describe, expect, it } from 'vitest'
import type { Status } from '../api/types'
import { RANK_STEP, computeInsertRank, endOfColumnRank } from './rank'

interface T {
  id: number
  sort_order: number
}

const col: T[] = [
  { id: 1, sort_order: 1024 },
  { id: 2, sort_order: 2048 },
  { id: 3, sort_order: 3072 },
]

describe('computeInsertRank', () => {
  it('afterId=null は先頭(最小-STEP)', () => {
    expect(computeInsertRank(col, null, 99)).toBe(1024 - RANK_STEP)
  })

  it('空カラムの先頭は STEP', () => {
    expect(computeInsertRank([], null, 99)).toBe(RANK_STEP)
  })

  it('中間に置くと隣接の中点', () => {
    // id=1 の直後 → 1024 と 2048 の中点 = 1536
    expect(computeInsertRank(col, 1, 99)).toBe(1536)
  })

  it('末尾に置くと最後+STEP', () => {
    expect(computeInsertRank(col, 3, 99)).toBe(3072 + RANK_STEP)
  })

  it('移動対象自身は計算から除外される', () => {
    // id=2 を移動対象として id=1 の直後へ → 1024 と 3072 の中点 = 2048
    expect(computeInsertRank(col, 1, 2)).toBe((1024 + 3072) / 2)
  })

  it('afterId が見つからない場合は末尾', () => {
    expect(computeInsertRank(col, 999, 99)).toBe(3072 + RANK_STEP)
  })

  it('順不同の入力でも sort_order でソートして計算する', () => {
    const shuffled: T[] = [
      { id: 3, sort_order: 3072 },
      { id: 1, sort_order: 1024 },
      { id: 2, sort_order: 2048 },
    ]
    expect(computeInsertRank(shuffled, 1, 99)).toBe(1536)
  })
})

describe('endOfColumnRank', () => {
  const tasks: { id: number; sort_order: number; status: Status }[] = [
    { id: 1, sort_order: 1024, status: 'todo' },
    { id: 2, sort_order: 2048, status: 'todo' },
    { id: 3, sort_order: 5000, status: 'done' },
  ]
  it('対象ステータスの最大+STEP', () => {
    expect(endOfColumnRank(tasks, 'todo')).toBe(2048 + RANK_STEP)
  })
  it('空カラムは STEP', () => {
    expect(endOfColumnRank(tasks, 'backlog')).toBe(RANK_STEP)
  })
})
