import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusSelect } from './StatusSelect'
import { PrioritySelect } from './PrioritySelect'

describe('StatusSelect', () => {
  it('メニューを開いて選択すると onChange が値付きで発火する', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StatusSelect value="todo" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'ステータス' }))
    await user.click(await screen.findByRole('menuitem', { name: '進行中' }))

    expect(onChange).toHaveBeenCalledWith('in_progress')
  })

  it('chip variant は現在ステータスのラベルを表示する', () => {
    render(<StatusSelect value="done" onChange={() => {}} />)
    // aria-label は「ステータス」だが、チップ内テキストに現在ラベルを出す
    expect(screen.getByText('完了')).toBeInTheDocument()
  })
})

describe('PrioritySelect', () => {
  it('メニューから優先度を選ぶと onChange が発火する', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PrioritySelect value="none" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '優先度' }))
    await user.click(await screen.findByRole('menuitem', { name: '緊急' }))

    expect(onChange).toHaveBeenCalledWith('urgent')
  })
})
