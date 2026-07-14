import * as MenuPrimitive from '@radix-ui/react-dropdown-menu'
import { clsx } from 'clsx'
import type { ComponentProps } from 'react'

export const DropdownMenu = MenuPrimitive.Root
export const DropdownMenuTrigger = MenuPrimitive.Trigger

export function DropdownMenuContent({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={clsx(
          'anim-pop z-50 min-w-[200px] rounded-lg border border-edge bg-raise p-1 shadow-xl shadow-black/40 focus:outline-none',
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  )
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={clsx(
        'flex cursor-default select-none items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-ink outline-none data-[highlighted]:bg-hover',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Label>) {
  return (
    <MenuPrimitive.Label
      className={clsx('px-2.5 py-1.5 text-xs text-dim', className)}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={clsx('my-1 h-px bg-edge', className)} {...props} />
}
