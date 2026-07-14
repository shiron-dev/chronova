import { Check, UserPlus } from 'lucide-react'
import type { AssigneeRef } from '../../../api/types'
import { t } from '../../../lib/i18n'
import { useMembersList } from '../../../hooks/useMembers'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/Popover'
import { AvatarStack, MemberAvatar } from '../../members/MemberAvatar'
import { chipClass, iconBtnClass } from './chipStyle'

export function AssigneePicker({
  assignees,
  onChange,
  variant = 'chip',
}: {
  assignees: AssigneeRef[]
  onChange: (memberIds: number[]) => void
  variant?: 'icon' | 'chip'
}) {
  const { data: members = [] } = useMembersList()
  const selectedIds = assignees.map((a) => a.id)

  const toggle = (id: number) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={variant === 'icon' ? iconBtnClass : chipClass}
          onClick={(e) => e.stopPropagation()}
          aria-label={t.fields.assignees}
        >
          {assignees.length > 0 ? (
            <AvatarStack assignees={assignees} size={variant === 'icon' ? 18 : 16} />
          ) : (
            <UserPlus size={14} className="text-dim" />
          )}
          {variant === 'chip' && (
            <span>
              {assignees.length === 0
                ? t.task.noAssignee
                : assignees.length === 1
                  ? assignees[0].name
                  : `${assignees.length}人`}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-h-72 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {members.map((member) => (
          <button
            key={member.id}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink hover:bg-hover"
            onClick={() => toggle(member.id)}
          >
            <MemberAvatar member={member} size={18} />
            <span className="flex-1 truncate">{member.name}</span>
            <span className="text-[10px] text-faint">{t.memberType[member.type]}</span>
            {selectedIds.includes(member.id) && <Check size={14} className="text-accent" />}
          </button>
        ))}
        {members.length === 0 && (
          <p className="px-2.5 py-2 text-xs text-dim">{t.empty.noMembers}</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
