import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { useUI } from '../../stores/ui'

function ToastItem({ id, message }: { id: number; message: string }) {
  const dismissToast = useUI((s) => s.dismissToast)
  useEffect(() => {
    const timer = setTimeout(() => dismissToast(id), 4500)
    return () => clearTimeout(timer)
  }, [id, dismissToast])
  return (
    <div className="anim-toast flex items-center gap-2.5 rounded-lg border border-edge bg-raise px-4 py-2.5 text-[13px] text-ink shadow-xl shadow-black/40">
      <AlertCircle size={15} className="shrink-0 text-danger" />
      {message}
    </div>
  )
}

export function Toaster() {
  const toasts = useUI((s) => s.toasts)
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} id={toast.id} message={toast.message} />
      ))}
    </div>
  )
}
