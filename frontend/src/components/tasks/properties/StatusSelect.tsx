import { Check } from 'lucide-react'
import type { Status } from '../../../api/types'
import { STATUS_ORDER, statusMeta } from '../../../lib/labels'
import { t } from '../../../lib/i18n'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/DropdownMenu'
import { StatusIcon } from '../StatusIcon'
import { chipClass, iconBtnClass } from './chipStyle'

export function StatusSelect({
  value,
  onChange,
  variant = 'chip',
}: {
  value: Status
  onChange: (status: Status) => void
  variant?: 'icon' | 'chip'
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={variant === 'icon' ? iconBtnClass : chipClass}
          onClick={(e) => e.stopPropagation()}
          aria-label={t.fields.status}
        >
          <StatusIcon status={value} />
          {variant === 'chip' && <span>{statusMeta[value].label}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
        {STATUS_ORDER.map((status) => (
          <DropdownMenuItem key={status} onSelect={() => onChange(status)}>
            <StatusIcon status={status} />
            <span className="flex-1">{statusMeta[status].label}</span>
            {status === value && <Check size={14} className="text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
