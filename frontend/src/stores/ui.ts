import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Status } from '../api/types'

export type PalettePage = 'root' | 'status' | 'priority' | 'assignee'

export interface NewTaskDefaults {
  projectId?: number
  status?: Status
}

interface Toast {
  id: number
  message: string
}

interface UIState {
  // 選択中タスク(J/K・ホバー・ピークパネルで更新)
  selectedTaskId: number | null
  setSelectedTaskId: (id: number | null) => void

  // 現在のビューに表示されている順序付きタスクID(キーボードナビ用)
  visibleTaskIds: number[]
  setVisibleTaskIds: (ids: number[]) => void

  // コマンドパレット
  paletteOpen: boolean
  palettePage: PalettePage
  openPalette: (page?: PalettePage) => void
  closePalette: () => void
  setPalettePage: (page: PalettePage) => void

  // 新規タスクモーダル
  newTaskOpen: boolean
  newTaskDefaults: NewTaskDefaults
  pageDefaults: NewTaskDefaults
  setPageDefaults: (d: NewTaskDefaults) => void
  openNewTask: (defaults?: NewTaskDefaults) => void
  closeNewTask: () => void

  // 新規プロジェクトモーダル(サイドバーとパレットの両方から開く)
  newProjectOpen: boolean
  openNewProject: () => void
  closeNewProject: () => void

  // 操作メンバー(認証の代わり。localStorageに永続化)
  currentMemberId: number | null
  setCurrentMemberId: (id: number | null) => void

  // トースト
  toasts: Toast[]
  pushToast: (message: string) => void
  dismissToast: (id: number) => void
}

let toastSeq = 1

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      selectedTaskId: null,
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),

      visibleTaskIds: [],
      setVisibleTaskIds: (ids) => set({ visibleTaskIds: ids }),

      paletteOpen: false,
      palettePage: 'root',
      openPalette: (page = 'root') => set({ paletteOpen: true, palettePage: page }),
      closePalette: () => set({ paletteOpen: false, palettePage: 'root' }),
      setPalettePage: (page) => set({ palettePage: page }),

      newTaskOpen: false,
      newTaskDefaults: {},
      pageDefaults: {},
      setPageDefaults: (d) => set({ pageDefaults: d }),
      openNewTask: (defaults) =>
        set({ newTaskOpen: true, newTaskDefaults: defaults ?? get().pageDefaults }),
      closeNewTask: () => set({ newTaskOpen: false, newTaskDefaults: {} }),

      newProjectOpen: false,
      openNewProject: () => set({ newProjectOpen: true }),
      closeNewProject: () => set({ newProjectOpen: false }),

      currentMemberId: null,
      setCurrentMemberId: (id) => set({ currentMemberId: id }),

      toasts: [],
      pushToast: (message) =>
        set((s) => ({ toasts: [...s.toasts, { id: toastSeq++, message }] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'chronova-ui',
      partialize: (s) => ({ currentMemberId: s.currentMemberId }),
    },
  ),
)
