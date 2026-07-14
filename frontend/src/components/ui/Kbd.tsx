import { clsx } from 'clsx'
import type { ReactNode } from 'react'

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={clsx(
        'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-edge bg-active px-1 font-sans text-[10px] font-medium text-dim',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
