import type { Priority } from '../../api/types'
import { priorityMeta } from '../../lib/labels'

const FAINT = '#3d4046'

/** Linear風の優先度アイコン(バー3本 / 緊急バッジ / なし=ドット) */
export function PriorityIcon({ priority, size = 14 }: { priority: Priority; size?: number }) {
  const color = priorityMeta[priority].color
  const common = { width: size, height: size, viewBox: '0 0 14 14', 'aria-hidden': true }

  if (priority === 'urgent') {
    return (
      <svg {...common}>
        <rect x="1" y="1" width="12" height="12" rx="3" fill={color} />
        <path d="M7 3.8 V8" stroke="#0f1011" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="7" cy="10.3" r="1" fill="#0f1011" />
      </svg>
    )
  }
  if (priority === 'none') {
    return (
      <svg {...common}>
        <circle cx="3" cy="7" r="1.1" fill={color} />
        <circle cx="7" cy="7" r="1.1" fill={color} />
        <circle cx="11" cy="7" r="1.1" fill={color} />
      </svg>
    )
  }

  const filled = priority === 'high' ? 3 : priority === 'medium' ? 2 : 1
  const bars = [
    { x: 1.5, height: 4.5 },
    { x: 5.75, height: 7.5 },
    { x: 10, height: 10.5 },
  ]
  return (
    <svg {...common}>
      {bars.map((bar, i) => (
        <rect
          key={bar.x}
          x={bar.x}
          y={12.5 - bar.height}
          width="2.6"
          height={bar.height}
          rx="1.1"
          fill={i < filled ? '#8b8d93' : FAINT}
        />
      ))}
    </svg>
  )
}
