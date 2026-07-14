import { UserCircle } from 'lucide-react'
import { t } from '../lib/i18n'
import { useUI } from '../stores/ui'
import { TaskWorkspace } from '../components/tasks/TaskWorkspace'
import { EmptyState } from '../components/ui/EmptyState'

export function MyTasksPage() {
  const currentMemberId = useUI((s) => s.currentMemberId)

  if (currentMemberId == null) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-13 shrink-0 items-center border-b border-edge px-6">
          <h1 className="text-sm font-semibold text-ink">{t.nav.myTasks}</h1>
        </header>
        <EmptyState icon={UserCircle} title={t.nav.myTasks} hint={t.member.selectPrompt} />
      </div>
    )
  }

  return <TaskWorkspace title={t.nav.myTasks} filters={{ assigneeId: currentMemberId }} />
}
