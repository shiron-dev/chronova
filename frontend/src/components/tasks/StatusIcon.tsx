import type { Status } from '../../api/types'
import { statusMeta } from '../../lib/labels'

/** Linear風のステータスリングアイコン */
export function StatusIcon({ status, size = 14 }: { status: Status; size?: number }) {
  const color = statusMeta[status].color
  const common = { width: size, height: size, viewBox: '0 0 14 14', 'aria-hidden': true }

  switch (status) {
    case 'backlog':
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="5.4" fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="1.8 2.1" />
        </svg>
      )
    case 'todo':
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="5.4" fill="none" stroke={color} strokeWidth="1.6" />
        </svg>
      )
    case 'in_progress':
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="5.4" fill="none" stroke={color} strokeWidth="1.6" />
          <path d="M7 3.6 A3.4 3.4 0 0 1 7 10.4 Z" fill={color} />
        </svg>
      )
    case 'done':
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="6" fill={color} />
          <path
            d="M4.4 7.2 L6.2 9 L9.7 5.4"
            fill="none"
            stroke="#0f1011"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'canceled':
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="6" fill={color} />
          <path
            d="M4.9 4.9 L9.1 9.1 M9.1 4.9 L4.9 9.1"
            stroke="#0f1011"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )
  }
}
