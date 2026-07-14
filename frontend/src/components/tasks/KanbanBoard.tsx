import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus } from 'lucide-react'
import { clsx } from 'clsx'
import type { Status, Task } from '../../api/types'
import { STATUS_ORDER, statusMeta } from '../../lib/labels'
import { t } from '../../lib/i18n'
import { useMoveTask } from '../../hooks/useTasks'
import { useUI } from '../../stores/ui'
import { StatusIcon } from './StatusIcon'
import { TaskCard } from './TaskCard'

type Columns = Record<Status, number[]>

function buildColumns(tasks: Task[]): Columns {
  const cols: Columns = { backlog: [], todo: [], in_progress: [], done: [], canceled: [] }
  const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
  for (const task of sorted) cols[task.status].push(task.id)
  return cols
}

function findColumn(id: UniqueIdentifier, cols: Columns): Status | null {
  if (typeof id === 'string') {
    return id.startsWith('col:') ? (id.slice(4) as Status) : null
  }
  for (const status of STATUS_ORDER) {
    if (cols[status].includes(id)) return status
  }
  return null
}

function SortableTaskCard({ task, showProject }: { task: Task; showProject: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: task.id < 0,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(isDragging && 'opacity-40')}
      data-sortable-id={task.id}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} showProject={showProject} />
    </div>
  )
}

function KanbanColumn({
  status,
  taskIds,
  byId,
  showProject,
}: {
  status: Status
  taskIds: number[]
  byId: Map<number, Task>
  showProject: boolean
}) {
  const { setNodeRef } = useDroppable({ id: `col:${status}` })
  const openNewTask = useUI((s) => s.openNewTask)
  const pageDefaults = useUI((s) => s.pageDefaults)
  const tasks = taskIds.map((id) => byId.get(id)).filter((task): task is Task => task != null)

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-panel/70">
      <div className="flex h-10 shrink-0 items-center gap-2 px-3">
        <StatusIcon status={status} />
        <span className="text-[13px] font-medium text-ink">{statusMeta[status].label}</span>
        <span className="text-xs text-dim">{taskIds.length}</span>
        <button
          className="ml-auto flex h-6 w-6 items-center justify-center rounded text-dim hover:bg-active hover:text-ink"
          onClick={() => openNewTask({ ...pageDefaults, status })}
          aria-label={t.actions.newTask}
        >
          <Plus size={14} />
        </button>
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} showProject={showProject} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

export function KanbanBoard({
  tasks,
  showProject = true,
}: {
  tasks: Task[]
  showProject?: boolean
}) {
  const moveTask = useMoveTask()
  const setVisibleTaskIds = useUI((s) => s.setVisibleTaskIds)
  const byId = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const dataColumns = useMemo(() => buildColumns(tasks), [tasks])

  // ドラッグ中はローカルのカラム構成で挿入位置をプレビューする
  const [dragColumns, setDragColumns] = useState<Columns | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const columns = dragColumns ?? dataColumns

  const orderedIds = useMemo(
    () => STATUS_ORDER.flatMap((s) => dataColumns[s]).filter((id) => id > 0),
    [dataColumns],
  )
  const orderKey = orderedIds.join(',')
  useEffect(() => {
    setVisibleTaskIds(orderedIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey, setVisibleTaskIds])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as number)
    setDragColumns(dataColumns)
  }

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over) return
    setDragColumns((cols) => {
      if (!cols) return cols
      const from = findColumn(active.id, cols)
      const to = findColumn(over.id, cols)
      if (!from || !to || from === to) return cols
      const fromIds = cols[from].filter((id) => id !== active.id)
      const toIds = cols[to].filter((id) => id !== active.id)
      const overIndex = typeof over.id === 'number' ? toIds.indexOf(over.id) : -1
      toIds.splice(overIndex < 0 ? toIds.length : overIndex, 0, active.id as number)
      return { ...cols, [from]: fromIds, [to]: toIds }
    })
  }

  const finishDrag = () => {
    setActiveId(null)
    setDragColumns(null)
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    const cols = dragColumns ?? dataColumns
    finishDrag()
    if (!over) return
    const task = byId.get(active.id as number)
    if (!task) return

    const to = findColumn(over.id, cols) ?? findColumn(active.id, cols)
    if (!to) return
    let ids = [...cols[to]]
    // 同一カラム内の並べ替えはドロップ先カードの位置へ移動する
    if (typeof over.id === 'number' && over.id !== active.id) {
      const oldIndex = ids.indexOf(active.id as number)
      const newIndex = ids.indexOf(over.id)
      if (oldIndex !== -1 && newIndex !== -1) ids = arrayMove(ids, oldIndex, newIndex)
    }
    const idx = ids.indexOf(active.id as number)
    if (idx === -1) return
    const afterId = idx > 0 ? ids[idx - 1] : null

    // 元の位置と変わらなければ何もしない
    const origIds = dataColumns[task.status]
    const origIdx = origIds.indexOf(task.id)
    const origAfter = origIdx > 0 ? origIds[origIdx - 1] : null
    if (to === task.status && afterId === origAfter) return

    moveTask.mutate({ id: task.id, status: to, afterId })
  }

  const activeTask = activeId != null ? byId.get(activeId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={finishDrag}
    >
      <div className="flex flex-1 gap-3 overflow-x-auto px-6 py-4">
        {STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            taskIds={columns[status]}
            byId={byId}
            showProject={showProject}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} showProject={showProject} overlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
