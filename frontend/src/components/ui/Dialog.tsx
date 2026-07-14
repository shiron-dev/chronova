import * as DialogPrimitive from '@radix-ui/react-dialog'
import { clsx } from 'clsx'
import type { ComponentProps, ReactNode } from 'react'

export const Dialog = DialogPrimitive.Root
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { children: ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="anim-overlay fixed inset-0 z-40 bg-black/55" />
      <DialogPrimitive.Content
        className={clsx(
          'anim-dialog fixed left-1/2 top-[16%] z-50 w-[600px] max-w-[calc(100vw-2rem)] -translate-x-1/2',
          'rounded-xl border border-edge bg-panel shadow-2xl shadow-black/50 focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={clsx('text-sm font-semibold text-ink', className)}
      {...props}
    />
  )
}
