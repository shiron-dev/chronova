import { Dialog, DialogContent, DialogTitle } from './Dialog'
import { Button } from './Button'
import { t } from '../../lib/i18n'

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = t.actions.delete,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  confirmLabel?: string
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[420px]">
        <div className="flex flex-col gap-3 p-5">
          <DialogTitle>{title}</DialogTitle>
          <p className="text-[13px] text-dim">{body}</p>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              {t.actions.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
