import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { Priority, Status } from '../../api/types'
import { StatusIcon } from './StatusIcon'
import { PriorityIcon } from './PriorityIcon'

const STATUSES: Status[] = ['backlog', 'todo', 'in_progress', 'done', 'canceled']
const PRIORITIES: Priority[] = ['none', 'low', 'medium', 'high', 'urgent']

describe('StatusIcon', () => {
  it.each(STATUSES)('%s を svg で描画する', (status) => {
    const { container } = render(<StatusIcon status={status} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '14')
  })
})

describe('PriorityIcon', () => {
  it.each(PRIORITIES)('%s を svg で描画する', (priority) => {
    const { container } = render(<PriorityIcon priority={priority} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
