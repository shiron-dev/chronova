import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { AllTasksPage } from './routes/AllTasksPage'
import { MyTasksPage } from './routes/MyTasksPage'
import { ProjectPage } from './routes/ProjectPage'
import { MembersPage } from './routes/MembersPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/tasks" replace />} />
        <Route path="/tasks" element={<AllTasksPage />} />
        <Route path="/my" element={<MyTasksPage />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="*" element={<Navigate to="/tasks" replace />} />
      </Route>
    </Routes>
  )
}
