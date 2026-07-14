import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { TaskRow } from './TaskRow'
import { renderWithProviders } from '../../test/utils'
import { makeTask } from '../../test/fixtures'
import { useUI } from '../../stores/ui'

vi.mock('../../api/tasks', () => ({
  updateTask: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-14T09:00:00Z'))
  useUI.setState({ selectedTaskId: null })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('TaskRow', () => {
  it('identifier とタイトルを表示する', () => {
    renderWithProviders(<TaskRow task={makeTask({ identifier: 'CHR-42', title: '重要タスク' })} />)
    expect(screen.getByText('CHR-42')).toBeInTheDocument()
    expect(screen.getByText('重要タスク')).toBeInTheDocument()
  })

  it('期限切れは danger 色で表示する', () => {
    renderWithProviders(
      <TaskRow task={makeTask({ due_date: '2026-07-10', status: 'todo' })} />,
    )
    const due = screen.getByText('7月10日')
    expect(due.className).toContain('text-danger')
  })

  it('未来の期限は danger 色にしない', () => {
    renderWithProviders(
      <TaskRow task={makeTask({ due_date: '2026-07-20', status: 'todo' })} />,
    )
    const due = screen.getByText('7月20日')
    expect(due.className).not.toContain('text-danger')
  })

  it('楽観挿入中(負ID)の行は非インタラクティブ', () => {
    renderWithProviders(<TaskRow task={makeTask({ id: -1, identifier: '…' })} />)
    const row = document.querySelector('[data-task-id="-1"]') as HTMLElement
    expect(row.className).toContain('opacity-50')
    expect(row.className).toContain('pointer-events-none')
  })

  it('プロジェクト名を表示する(showProject=true)', () => {
    renderWithProviders(
      <TaskRow
        task={makeTask({ project: { id: 1, name: 'モバイルアプリ', color: '#000', icon: 'box' } })}
      />,
    )
    expect(screen.getByText('モバイルアプリ')).toBeInTheDocument()
  })
})
