import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AvatarStack, MemberAvatar } from './MemberAvatar'
import type { AssigneeRef } from '../../api/types'

describe('MemberAvatar', () => {
  it('人間は頭文字を表示する', () => {
    render(<MemberAvatar member={{ name: '花子', type: 'human', avatar_color: '#E0768D' }} />)
    expect(screen.getByText('花')).toBeInTheDocument()
  })

  it('AIエージェントは頭文字でなくBotアイコンを表示する', () => {
    const { container } = render(
      <MemberAvatar member={{ name: 'デプロイBot', type: 'agent', avatar_color: '#5E6AD2' }} />,
    )
    // 頭文字テキストは出さない
    expect(screen.queryByText('デ')).not.toBeInTheDocument()
    // lucide の Bot アイコン(svg)を描画する
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('title 属性に名前が入る', () => {
    render(<MemberAvatar member={{ name: '田中 太郎', type: 'human', avatar_color: '#000000' }} />)
    expect(screen.getByTitle('田中 太郎')).toBeInTheDocument()
  })
})

describe('AvatarStack', () => {
  const make = (n: number): AssigneeRef[] =>
    Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      name: `M${i + 1}`,
      type: 'human' as const,
      avatar_color: '#000000',
    }))

  it('担当者0人なら何も描画しない', () => {
    const { container } = render(<AvatarStack assignees={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('max を超えると +N を表示する', () => {
    render(<AvatarStack assignees={make(5)} max={3} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('max 以内なら +N は出さない', () => {
    render(<AvatarStack assignees={make(2)} max={3} />)
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })
})
