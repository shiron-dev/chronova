import { describe, expect, it } from 'vitest'
import {
  applyTaskPatch,
  buildTempTask,
  taskMatchesFilter,
  toAssignees,
  toProjectRef,
} from './optimistic'
import { makeMember, makeProject, makeTask } from '../test/fixtures'

const members = [
  makeMember({ id: 1, name: 'A', type: 'human' }),
  makeMember({ id: 2, name: 'Bot', type: 'agent' }),
]
const projects = [makeProject({ id: 10, name: 'P10' }), makeProject({ id: 20, name: 'P20' })]

describe('toProjectRef / toAssignees', () => {
  it('toProjectRef は id からプロジェクト参照を作る', () => {
    expect(toProjectRef(projects, 10)?.name).toBe('P10')
    expect(toProjectRef(projects, null)).toBeNull()
    expect(toProjectRef(projects, 999)).toBeNull()
  })

  it('toAssignees は存在するメンバーのみを展開する', () => {
    const got = toAssignees(members, [2, 999, 1])
    expect(got.map((a) => a.id)).toEqual([2, 1])
    expect(got[0].type).toBe('agent')
  })
})

describe('applyTaskPatch', () => {
  const base = makeTask({ id: 5, status: 'todo', sort_order: 1024 })
  const ctx = { members, projects, bottomRank: 9999 }

  it('タイトル/優先度など単純フィールドを反映する', () => {
    const next = applyTaskPatch(base, { title: '新タイトル', priority: 'high' }, ctx)
    expect(next.title).toBe('新タイトル')
    expect(next.priority).toBe('high')
    // 未指定フィールドは保持
    expect(next.status).toBe('todo')
  })

  it('status変更時は bottomRank を付与する', () => {
    const next = applyTaskPatch(base, { status: 'in_progress' }, ctx)
    expect(next.status).toBe('in_progress')
    expect(next.sort_order).toBe(9999)
  })

  it('同一statusへの変更では sort_order を変えない', () => {
    const next = applyTaskPatch(base, { status: 'todo' }, ctx)
    expect(next.sort_order).toBe(1024)
  })

  it('project_id / assignee_ids を参照に解決する', () => {
    const next = applyTaskPatch(base, { project_id: 20, assignee_ids: [1, 2] }, ctx)
    expect(next.project?.name).toBe('P20')
    expect(next.assignees.map((a) => a.id)).toEqual([1, 2])
  })

  it('null 明示で due_date / project をクリアできる', () => {
    const withValues = makeTask({
      due_date: '2026-07-20',
      project: { id: 10, name: 'P10', color: '#000000', icon: 'box' },
    })
    const next = applyTaskPatch(withValues, { due_date: null, project_id: null }, ctx)
    expect(next.due_date).toBeNull()
    expect(next.project).toBeNull()
  })

  it('元のオブジェクトを破壊しない(不変)', () => {
    applyTaskPatch(base, { title: 'x' }, ctx)
    expect(base.title).toBe('サンプルタスク')
  })
})

describe('buildTempTask', () => {
  it('負ID・プレースホルダ identifier の一時タスクを作る', () => {
    const temp = buildTempTask(
      { title: '仮', status: 'in_progress', assignee_ids: [1] },
      { members, projects, tempId: -3, sortOrder: 4096, nowIso: '2026-07-14T00:00:00Z' },
    )
    expect(temp.id).toBe(-3)
    expect(temp.identifier).toBe('…')
    expect(temp.status).toBe('in_progress')
    expect(temp.sort_order).toBe(4096)
    expect(temp.assignees).toHaveLength(1)
  })

  it('status未指定は todo', () => {
    const temp = buildTempTask(
      { title: '仮' },
      { members, projects, tempId: -1, sortOrder: 1024, nowIso: 'x' },
    )
    expect(temp.status).toBe('todo')
  })
})

describe('taskMatchesFilter', () => {
  const task = makeTask({
    project: { id: 10, name: 'P10', color: '#000000', icon: 'box' },
    assignees: [{ id: 1, name: 'A', type: 'human', avatar_color: '#000000' }],
  })

  it('フィルタ空なら一致', () => {
    expect(taskMatchesFilter(task, { projectId: null, assigneeId: null })).toBe(true)
  })
  it('projectId 一致/不一致', () => {
    expect(taskMatchesFilter(task, { projectId: 10, assigneeId: null })).toBe(true)
    expect(taskMatchesFilter(task, { projectId: 20, assigneeId: null })).toBe(false)
  })
  it('assigneeId 一致/不一致', () => {
    expect(taskMatchesFilter(task, { projectId: null, assigneeId: 1 })).toBe(true)
    expect(taskMatchesFilter(task, { projectId: null, assigneeId: 2 })).toBe(false)
  })
  it('両方指定は AND', () => {
    expect(taskMatchesFilter(task, { projectId: 10, assigneeId: 2 })).toBe(false)
  })
})
