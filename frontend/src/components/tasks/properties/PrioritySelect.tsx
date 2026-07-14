import { Check } from 'lucide-react'
import type { Priority } from '../../../api/types'
import { PRIORITY_ORDER, priorityMeta } from '../../../lib/labels'
import { t } from '../../../lib/i18n'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu'
import { PriorityIcon } from '../PriorityIcon'
import { chipClass, iconBtnClass } from './chipStyle'

export function PrioritySelect({
  value,
  onChange,
  variant = 'chip',
}: {
  value: Priority
  onChange: (priority: Priority) => void
  variant?: 'icon' | 'chip'
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={variant === 'icon' ? iconBtnClass : chipClass}
          onClick={(e) => e.stopPropagation()}
          aria-label={t.fields.priority}
        >
          <PriorityIcon priority={value} />
          {variant === 'chip' && (
            <span>{value === 'none' ? t.fields.priority : priorityMeta[value].label}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
        {PRIORITY_ORDER.map((priority) => (
          <DropdownMenuItem key={priority} onSelect={() => onChange(priority)}>
            <PriorityIcon priority={priority} />
            <span className="flex-1">{priorityMeta[priority].label}</span>
            {priority === value && <Check size={14} className="text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
