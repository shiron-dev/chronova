import * as PopoverPrimitive from '@radix-ui/react-popover'
import { clsx } from 'clsx'
import type { ComponentProps } from 'react'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor

export function PopoverContent({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={clsx(
          'anim-pop z-50 min-w-[200px] rounded-lg border border-edge bg-raise p-1 shadow-xl shadow-black/40 focus:outline-none',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
