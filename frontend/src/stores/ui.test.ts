import { beforeEach, describe, expect, it } from 'vitest'
import { useUI } from './ui'

// 各テスト前にストアを初期状態へ戻す
beforeEach(() => {
  localStorage.clear()
  useUI.setState({
    selectedTaskId: null,
    visibleTaskIds: [],
    paletteOpen: false,
    palettePage: 'root',
    newTaskOpen: false,
    newTaskDefaults: {},
    pageDefaults: {},
    newProjectOpen: false,
    currentMemberId: null,
    toasts: [],
  })
})

describe('command palette state', () => {
  it('openPalette はページ指定込みで開き、close でリセット', () => {
    useUI.getState().openPalette('status')
    expect(useUI.getState().paletteOpen).toBe(true)
    expect(useUI.getState().palettePage).toBe('status')

    useUI.getState().closePalette()
    expect(useUI.getState().paletteOpen).toBe(false)
    expect(useUI.getState().palettePage).toBe('root')
  })
})

describe('new task defaults', () => {
  it('引数なし openNewTask は pageDefaults を継承する', () => {
    useUI.getState().setPageDefaults({ projectId: 42 })
    useUI.getState().openNewTask()
    expect(useUI.getState().newTaskOpen).toBe(true)
    expect(useUI.getState().newTaskDefaults).toEqual({ projectId: 42 })
  })

  it('明示引数は pageDefaults より優先', () => {
    useUI.getState().setPageDefaults({ projectId: 42 })
    useUI.getState().openNewTask({ status: 'in_progress' })
    expect(useUI.getState().newTaskDefaults).toEqual({ status: 'in_progress' })
  })

  it('closeNewTask で閉じて defaults をクリア', () => {
    useUI.getState().openNewTask({ projectId: 1 })
    useUI.getState().closeNewTask()
    expect(useUI.getState().newTaskOpen).toBe(false)
    expect(useUI.getState().newTaskDefaults).toEqual({})
  })
})

describe('selection', () => {
  it('setSelectedTaskId / setVisibleTaskIds', () => {
    useUI.getState().setVisibleTaskIds([3, 1, 2])
    useUI.getState().setSelectedTaskId(2)
    expect(useUI.getState().visibleTaskIds).toEqual([3, 1, 2])
    expect(useUI.getState().selectedTaskId).toBe(2)
  })
})

describe('toasts', () => {
  it('push で追加、dismiss で削除、IDは一意', () => {
    useUI.getState().pushToast('A')
    useUI.getState().pushToast('B')
    const toasts = useUI.getState().toasts
    expect(toasts).toHaveLength(2)
    expect(toasts[0].id).not.toBe(toasts[1].id)

    useUI.getState().dismissToast(toasts[0].id)
    expect(useUI.getState().toasts.map((t) => t.message)).toEqual(['B'])
  })
})

describe('currentMember persistence', () => {
  it('currentMemberId のみ localStorage に永続化される(partialize)', () => {
    useUI.getState().setCurrentMemberId(7)
    useUI.getState().pushToast('揮発する')

    const raw = localStorage.getItem('chronova-ui')
    expect(raw).toBeTruthy()
    const persisted = JSON.parse(raw as string)
    expect(persisted.state.currentMemberId).toBe(7)
    // toasts など一時状態は永続化しない
    expect(persisted.state.toasts).toBeUndefined()
    expect(persisted.state.paletteOpen).toBeUndefined()
  })
})
