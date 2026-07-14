import { Outlet } from 'react-router'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useUI } from '../../stores/ui'
import { Sidebar } from './Sidebar'
import { TaskPeekPanel } from '../tasks/TaskPeekPanel'
import { NewTaskModal } from '../tasks/NewTaskModal'
import { CommandPalette } from '../command/CommandPalette'
import { ProjectFormDialog } from '../projects/ProjectFormDialog'
import { Toaster } from '../ui/Toaster'

export function AppShell() {
  useKeyboardShortcuts()
  const newProjectOpen = useUI((s) => s.newProjectOpen)
  const closeNewProject = useUI((s) => s.closeNewProject)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
      <TaskPeekPanel />
      <CommandPalette />
      <NewTaskModal />
      <ProjectFormDialog open={newProjectOpen} onOpenChange={(o) => !o && closeNewProject()} />
      <Toaster />
    </div>
  )
}
