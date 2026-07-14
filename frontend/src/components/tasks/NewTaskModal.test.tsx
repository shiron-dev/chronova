import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NewTaskModal } from './NewTaskModal'
import { renderWithProviders } from '../../test/utils'
import { useUI } from '../../stores/ui'
import * as tasksApi from '../../api/tasks'

vi.mock('../../api/tasks', () => ({
  createTask: vi.fn().mockResolvedValue({ id: 1, identifier: 'CHR-1' }),
}))
vi.mock('../../api/members', () => ({ listMembers: vi.fn().mockResolvedValue([]) }))
vi.mock('../../api/projects', () => ({ listProjects: vi.fn().mockResolvedValue([]) }))

beforeEach(() => {
  useUI.setState({ newTaskOpen: true, newTaskDefaults: {}, pageDefaults: {} })
})
afterEach(() => {
  useUI.setState({ newTaskOpen: false })
})

describe('NewTaskModal', () => {
  it('タイトルが空のとき作成ボタンは無効', () => {
    renderWithProviders(<NewTaskModal />)
    expect(screen.getByRole('button', { name: '作成' })).toBeDisabled()
  })

  it('タイトル入力→作成ボタンで createTask を呼ぶ', async () => {
    const user = userEvent.setup()
    renderWithProviders(<NewTaskModal />)

    await user.type(screen.getByPlaceholderText('タスクのタイトルを入力…'), '新しいタスク')
    const createBtn = screen.getByRole('button', { name: '作成' })
    expect(createBtn).toBeEnabled()
    await user.click(createBtn)

    await waitFor(() => {
      expect(tasksApi.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: '新しいタスク' }),
      )
    })
  })

  it('Cmd+Enter でも送信できる', async () => {
    const user = userEvent.setup()
    renderWithProviders(<NewTaskModal />)

    const input = screen.getByPlaceholderText('タスクのタイトルを入力…')
    await user.type(input, 'ショートカット作成')
    await user.keyboard('{Control>}{Enter}{/Control}')

    await waitFor(() => {
      expect(tasksApi.createTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'ショートカット作成' }),
      )
    })
  })
})
