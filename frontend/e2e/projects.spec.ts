import { expect, test } from '@playwright/test'
import { createProject, createTask, uniq } from './helpers'

test.describe.configure({ mode: 'serial' })

test('サイドバーからプロジェクトを作成できる', async ({ page }) => {
  await page.goto('/tasks')
  const name = uniq('PJ作成')
  await createProject(page, name)
})

test('プロジェクト名を編集できる', async ({ page }) => {
  await page.goto('/tasks')
  const name = uniq('PJ編集')
  await createProject(page, name)

  const item = page.getByTestId('project-item').filter({ hasText: name })
  await item.getByRole('button', { name: '編集' }).click()
  await page.getByRole('menuitem', { name: '編集' }).click()

  const renamed = `${name}-改`
  await page.getByPlaceholder('プロジェクト名').fill(renamed)
  await page.getByRole('dialog').getByRole('button', { name: '保存' }).click()

  await expect(page.getByTestId('project-item').filter({ hasText: renamed })).toBeVisible()
})

test('プロジェクトを削除するとタスクは孤児化してすべてのタスクに残る', async ({ page }) => {
  await page.goto('/tasks')
  const name = uniq('PJ削除')
  await createProject(page, name)

  // プロジェクトページへ移動し、そのプロジェクトにタスクを作成
  await page.getByTestId('project-item').filter({ hasText: name }).click()
  // ページ(と新規タスクの既定プロジェクト)が確定してから作成する
  await expect(page.getByRole('heading', { name })).toBeVisible()
  const taskTitle = uniq('孤児タスク')
  await createTask(page, taskTitle)

  // プロジェクトを削除
  await page.goto('/tasks')
  const item = page.getByTestId('project-item').filter({ hasText: name })
  await item.getByRole('button', { name: '編集' }).click()
  await page.getByRole('menuitem', { name: '削除' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '削除' }).click()

  await expect(page.getByTestId('project-item').filter({ hasText: name })).toHaveCount(0)
  // タスクはすべてのタスクに残る
  await expect(page.locator('[data-task-id]', { hasText: taskTitle }).first()).toBeVisible()
})
