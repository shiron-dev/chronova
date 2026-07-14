import { clsx } from 'clsx'
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'h-8 w-full rounded-md border border-edge bg-app px-3 text-[13px] text-ink transition-colors focus:border-accent focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'w-full resize-none rounded-md border border-edge bg-app px-3 py-2 text-[13px] text-ink transition-colors focus:border-accent focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}
