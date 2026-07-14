import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon
  title: string
  hint?: string
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-edge bg-raise">
        <Icon size={22} className="text-dim" />
      </div>
      <p className="mt-2 text-sm font-medium text-ink">{title}</p>
      {hint && <p className="text-[13px] text-dim">{hint}</p>}
    </div>
  )
}
