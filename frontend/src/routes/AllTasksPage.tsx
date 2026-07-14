import { t } from '../lib/i18n'
import { TaskWorkspace } from '../components/tasks/TaskWorkspace'

export function AllTasksPage() {
  return <TaskWorkspace title={t.nav.allTasks} filters={{}} />
}
