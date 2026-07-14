import { CalendarDays, X } from 'lucide-react'
import { clsx } from 'clsx'
import { t } from '../../../lib/i18n'
import { formatDueDate } from '../../../lib/date'
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/Popover'
import { chipClass } from './chipStyle'

export function DueDatePicker({
  value,
  onChange,
  overdue = false,
}: {
  value: string | null
  onChange: (date: string | null) => void
  overdue?: boolean
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={clsx(chipClass, overdue && 'border-danger/40 text-danger')}
          onClick={(e) => e.stopPropagation()}
          aria-label={t.fields.dueDate}
        >
          <CalendarDays size={14} className={overdue ? 'text-danger' : 'text-dim'} />
          <span>{value ? formatDueDate(value) : t.task.noDueDate}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex min-w-0 items-center gap-1 p-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-8 rounded-md border border-edge bg-app px-2 text-[13px] text-ink [color-scheme:dark] focus:border-accent focus:outline-none"
        />
        {value && (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-dim hover:bg-hover hover:text-ink"
            onClick={() => onChange(null)}
            aria-label={t.actions.clear}
          >
            <X size={14} />
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
