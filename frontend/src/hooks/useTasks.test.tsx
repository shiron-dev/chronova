import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeTestQueryClient } from '../test/utils'
import { makeMember, makeProject, makeTask } from '../test/fixtures'
import { keys } from '../lib/queryKeys'
import { useUI } from '../stores/ui'
import {
  collectCachedTasks,
  useCreateTask,
  useDeleteTask,
  useMoveTask,
  useUpdateTask,
} from './useTasks'
import * as tasksApi from '../api/tasks'

vi.mock('../api/tasks', () => ({
  listTasks: vi.fn(),
  getTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  moveTask: vi.fn(),
  deleteTask: vi.fn(),
}))

const mockedApi = vi.mocked(tasksApi)

// 全リスト用フィルタキー
const ALL = keys.tasks.list({})

function setup() {
  const client = makeTestQueryClient()
  // members / projects をキャッシュに用意(楽観適用が参照する)
  client.setQueryData(keys.members, [makeMember({ id: 1 }), makeMember({ id: 2, type: 'agent' })])
  client.setQueryData(keys.projects, [makeProject({ id: 10 })])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

function cachedTask(client: ReturnType<typeof setup>['client'], id: number) {
  return collectCachedTasks(client).find((t) => t.id === id)
}

beforeEach(() => {
  useUI.setState({ toasts: [] })
})
afterEach(() => {
  vi.clearAllMocks()
})

describe('useUpdateTask', () => {
  it('即座に楽観反映し、成功後も維持する', async () => {
    const { client, wrapper } = setup()
    client.setQueryData(ALL, [makeTask({ id: 1, priority: 'none' })])
    mockedApi.updateTask.mockResolvedValue(makeTask({ id: 1, priority: 'high' }))

    const { result } = renderHook(() => useUpdateTask(), { wrapper })
    result.current.mutate({ id: 1, patch: { priority: 'high' } })

    // onMutate 同期適用
    await waitFor(() => expect(cachedTask(client, 1)?.priority).toBe('high'))
    expect(mockedApi.updateTask).toHaveBeenCalledWith(1, { priority: 'high' })
  })

  it('status変更で新カラム末尾へ sort_order を更新する', async () => {
    const { client, wrapper } = setup()
    client.setQueryData(ALL, [
      makeTask({ id: 1, status: 'todo', sort_order: 1024 }),
      makeTask({ id: 2, status: 'in_progress', sort_order: 5000 }),
    ])
    mockedApi.updateTask.mockResolvedValue(makeTask({ id: 1, status: 'in_progress' }))

    const { result } = renderHook(() => useUpdateTask(), { wrapper })
    result.current.mutate({ id: 1, patch: { status: 'in_progress' } })

    await waitFor(() => expect(cachedTask(client, 1)?.status).toBe('in_progress'))
    // in_progress カラム最大(5000)+1024
    expect(cachedTask(client, 1)?.sort_order).toBe(6024)
  })

  it('エラー時はロールバックしトーストを出す', async () => {
    const { client, wrapper } = setup()
    client.setQueryData(ALL, [makeTask({ id: 1, title: '元のまま' })])
    mockedApi.updateTask.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useUpdateTask(), { wrapper })
    result.current.mutate({ id: 1, patch: { title: '変更後' } })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cachedTask(client, 1)?.title).toBe('元のまま')
    expect(useUI.getState().toasts.length).toBeGreaterThan(0)
  })
})

describe('useMoveTask', () => {
  it('楽観的に中点rankを付与して並べ替える', async () => {
    const { client, wrapper } = setup()
    client.setQueryData(ALL, [
      makeTask({ id: 1, status: 'todo', sort_order: 1024 }),
      makeTask({ id: 2, status: 'todo', sort_order: 2048 }),
      makeTask({ id: 3, status: 'todo', sort_order: 3072 }),
    ])
    mockedApi.moveTask.mockResolvedValue(makeTask({ id: 3 }))

    const { result } = renderHook(() => useMoveTask(), { wrapper })
    // 3 を 1 の直後へ → 1024 と 2048 の中点 = 1536
    result.current.mutate({ id: 3, status: 'todo', afterId: 1 })

    await waitFor(() => expect(cachedTask(client, 3)?.sort_order).toBe(1536))
  })

  it('エラー時はロールバックする', async () => {
    const { client, wrapper } = setup()
    client.setQueryData(ALL, [
      makeTask({ id: 1, status: 'todo', sort_order: 1024 }),
      makeTask({ id: 2, status: 'todo', sort_order: 2048 }),
    ])
    mockedApi.moveTask.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useMoveTask(), { wrapper })
    result.current.mutate({ id: 2, status: 'in_progress', afterId: null })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cachedTask(client, 2)?.status).toBe('todo')
  })
})

describe('useCreateTask', () => {
  it('フィルタ一致するリストにのみ負ID一時タスクを挿入する', async () => {
    const { client, wrapper } = setup()
    const projFilter = keys.tasks.list({ projectId: 10 })
    const otherFilter = keys.tasks.list({ projectId: 999 })
    client.setQueryData(ALL, [])
    client.setQueryData(projFilter, [])
    client.setQueryData(otherFilter, [])
    mockedApi.createTask.mockResolvedValue(makeTask({ id: 100 }))

    const { result } = renderHook(() => useCreateTask(), { wrapper })
    result.current.mutate({ title: '新規', project_id: 10 })

    await waitFor(() => {
      const all = client.getQueryData(ALL) as { id: number }[]
      expect(all.some((t) => t.id < 0)).toBe(true)
    })
    // project 10 のリストには入るが、別プロジェクトのリストには入らない
    const proj = client.getQueryData(projFilter) as { id: number }[]
    const other = client.getQueryData(otherFilter) as { id: number }[]
    expect(proj.some((t) => t.id < 0)).toBe(true)
    expect(other.length).toBe(0)
  })
})

describe('useDeleteTask', () => {
  it('楽観的に除去し、エラー時は復元する', async () => {
    const { client, wrapper } = setup()
    client.setQueryData(ALL, [makeTask({ id: 1 }), makeTask({ id: 2 })])
    mockedApi.deleteTask.mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useDeleteTask(), { wrapper })
    result.current.mutate(1)

    // まず楽観削除、その後エラーで復元
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cachedTask(client, 1)).toBeDefined()
  })
})
