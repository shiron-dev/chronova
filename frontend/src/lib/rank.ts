import type { Status } from '../api/types'

// 隣接タスク間に空ける整数ギャップ。中点挿入が整数で収まる余地を残す。
export const RANK_STEP = 1024

interface Ranked {
  id: number
  sort_order: number
}

/**
 * ドロップ位置の楽観的な sort_order を求める(サーバーの rank 算法をローカルで再現)。
 * @param tasksInStatus 移動先ステータスの全タスク(移動対象を含んでいてよい)
 * @param afterId この直後に置く。null なら先頭
 * @param movingId 移動対象のID(計算から除外する)
 */
export function computeInsertRank<T extends Ranked>(
  tasksInStatus: T[],
  afterId: number | null,
  movingId: number,
): number {
  const column = tasksInStatus
    .filter((task) => task.id !== movingId)
    .sort((a, b) => a.sort_order - b.sort_order)

  if (afterId == null) {
    return column.length > 0 ? column[0].sort_order - RANK_STEP : RANK_STEP
  }

  const idx = column.findIndex((task) => task.id === afterId)
  if (idx === -1) {
    // アンカーが見つからない場合は末尾に置く
    return (column[column.length - 1]?.sort_order ?? 0) + RANK_STEP
  }

  const prev = column[idx].sort_order
  const next = column[idx + 1]?.sort_order
  return next === undefined ? prev + RANK_STEP : (prev + next) / 2
}

/** 指定ステータスの末尾(最大rank + STEP)を返す。空カラムなら STEP。 */
export function endOfColumnRank<T extends Ranked & { status: Status }>(
  tasks: T[],
  status: Status,
): number {
  const max = tasks
    .filter((task) => task.status === status)
    .reduce((acc, task) => Math.max(acc, task.sort_order), 0)
  return max + RANK_STEP
}
