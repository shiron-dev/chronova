import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useUI } from '../stores/ui'

function moveSelection(delta: number) {
  const ui = useUI.getState()
  const ids = ui.visibleTaskIds
  if (ids.length === 0) return
  const idx = ui.selectedTaskId != null ? ids.indexOf(ui.selectedTaskId) : -1
  const next =
    idx === -1
      ? delta > 0
        ? 0
        : ids.length - 1
      : Math.min(Math.max(idx + delta, 0), ids.length - 1)
  const id = ids[next]
  ui.setSelectedTaskId(id)
  document
    .querySelector(`[data-task-id="${id}"]`)
    ?.scrollIntoView({ block: 'nearest' })
}

/**
 * グローバルキーボードショートカット。AppShell で一度だけマウントする。
 *   Cmd/Ctrl+K: パレット / C: 新規タスク / J・K・↑↓: 選択移動
 *   Enter・O: 開く / S・P・A: ステータス/優先度/担当者変更 / Esc: 閉じる
 */
export function useKeyboardShortcuts() {
  const [, setSearchParams] = useSearchParams()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ui = useUI.getState()
      const mod = e.metaKey || e.ctrlKey

      // パレットは入力中でもトグルできる
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (ui.paletteOpen) ui.closePalette()
        else ui.openPalette()
        return
      }
      if (mod || e.altKey) return

      const target = e.target as HTMLElement | null
      // フォーム・ダイアログ内、および dnd-kit のキーボード操作中(カードに
      // フォーカスがある間)はショートカットを無効化する
      if (
        target?.closest(
          'input, textarea, select, [contenteditable="true"], [role="dialog"], [cmdk-root], [data-sortable-id]',
        )
      ) {
        return
      }
      if (ui.paletteOpen || ui.newTaskOpen) return

      const openTaskParam = new URLSearchParams(window.location.search).get('task')

      switch (e.key) {
        case 'c':
        case 'C':
          e.preventDefault()
          ui.openNewTask()
          break
        case 'j':
        case 'ArrowDown':
          e.preventDefault()
          moveSelection(1)
          break
        case 'k':
        case 'ArrowUp':
          e.preventDefault()
          moveSelection(-1)
          break
        case 'Enter':
        case 'o':
          // ボタン等にフォーカスがある場合はクリック挙動を優先する
          if (e.key === 'Enter' && target?.closest('button, a')) break
          if (ui.selectedTaskId != null && ui.selectedTaskId > 0) {
            e.preventDefault()
            const id = ui.selectedTaskId
            setSearchParams((prev) => {
              prev.set('task', String(id))
              return prev
            })
          }
          break
        case 's':
          if (ui.selectedTaskId != null) {
            e.preventDefault()
            ui.openPalette('status')
          }
          break
        case 'p':
          if (ui.selectedTaskId != null) {
            e.preventDefault()
            ui.openPalette('priority')
          }
          break
        case 'a':
          if (ui.selectedTaskId != null) {
            e.preventDefault()
            ui.openPalette('assignee')
          }
          break
        case 'Escape':
          if (openTaskParam) {
            setSearchParams((prev) => {
              prev.delete('task')
              return prev
            })
          } else {
            ui.setSelectedTaskId(null)
          }
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setSearchParams])
}
