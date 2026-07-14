import { Columns3, List } from 'lucide-react'
import { clsx } from 'clsx'
import { useSearchParams } from 'react-router'
import { t } from '../../lib/i18n'

export function useCurrentView(): 'list' | 'board' {
  const [searchParams] = useSearchParams()
  return searchParams.get('view') === 'board' ? 'board' : 'list'
}

export function ViewToggle() {
  const [, setSearchParams] = useSearchParams()
  const view = useCurrentView()

  const setView = (v: 'list' | 'board') => {
    setSearchParams((prev) => {
      prev.set('view', v)
      return prev
    })
  }

  const itemClass = (active: boolean) =>
    clsx(
      'flex h-6 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors',
      active ? 'bg-active text-ink' : 'text-dim hover:text-ink',
    )

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-edge p-0.5">
      <button className={itemClass(view === 'list')} onClick={() => setView('list')}>
        <List size={13} />
        {t.views.list}
      </button>
      <button className={itemClass(view === 'board')} onClick={() => setView('board')}>
        <Columns3 size={13} />
        {t.views.board}
      </button>
    </div>
  )
}
