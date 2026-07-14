import { Bot } from 'lucide-react'
import { clsx } from 'clsx'
import type { AssigneeRef, Member } from '../../api/types'

type AvatarMember = Pick<Member | AssigneeRef, 'name' | 'type' | 'avatar_color'>

/**
 * メンバーアバター。人間は丸型+頭文字、AIエージェントは角丸四角+Botアイコンで
 * ひと目で区別できるようにする。
 */
export function MemberAvatar({
  member,
  size = 18,
  className,
}: {
  member: AvatarMember
  size?: number
  className?: string
}) {
  const isAgent = member.type === 'agent'
  return (
    <span
      title={member.name}
      className={clsx(
        'inline-flex shrink-0 select-none items-center justify-center font-semibold text-white',
        isAgent ? 'rounded-[27%]' : 'rounded-full',
        className,
      )}
      style={{ width: size, height: size, backgroundColor: member.avatar_color, fontSize: size * 0.5 }}
    >
      {isAgent ? <Bot size={size * 0.66} strokeWidth={2.2} /> : member.name.charAt(0)}
    </span>
  )
}

export function AvatarStack({
  assignees,
  size = 18,
  max = 3,
}: {
  assignees: AssigneeRef[]
  size?: number
  max?: number
}) {
  if (assignees.length === 0) return null
  const shown = assignees.slice(0, max)
  const rest = assignees.length - shown.length
  return (
    <span className="inline-flex items-center">
      {shown.map((assignee, i) => (
        <span key={assignee.id} className={clsx(i > 0 && '-ml-1.5')}>
          <MemberAvatar
            member={assignee}
            size={size}
            className="ring-2 ring-app"
          />
        </span>
      ))}
      {rest > 0 && (
        <span
          className="-ml-1.5 inline-flex items-center justify-center rounded-full bg-active text-[9px] font-medium text-dim ring-2 ring-app"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </span>
  )
}
