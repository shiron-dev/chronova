import { Bot, User } from 'lucide-react'
import { clsx } from 'clsx'
import type { MemberType } from '../../api/types'
import { t } from '../../lib/i18n'

export function MemberTypeBadge({ type }: { type: MemberType }) {
  const isAgent = type === 'agent'
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        isAgent
          ? 'border-accent/40 bg-accent/15 text-[#a7aef0]'
          : 'border-edge bg-raise text-dim',
      )}
    >
      {isAgent ? <Bot size={11} /> : <User size={11} />}
      {t.memberType[type]}
    </span>
  )
}
