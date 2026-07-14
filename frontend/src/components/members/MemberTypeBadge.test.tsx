import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemberTypeBadge } from './MemberTypeBadge'

describe('MemberTypeBadge', () => {
  it('human は「人間」', () => {
    render(<MemberTypeBadge type="human" />)
    expect(screen.getByText('人間')).toBeInTheDocument()
  })
  it('agent は「AIエージェント」', () => {
    render(<MemberTypeBadge type="agent" />)
    expect(screen.getByText('AIエージェント')).toBeInTheDocument()
  })
})
