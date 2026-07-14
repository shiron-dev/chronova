import { expect, test } from '@playwright/test'
import { createTask, uniq } from './helpers'

test.describe.configure({ mode: 'serial' })

test('ピークパネルで優先度と期限を変更できる', async ({ page }) => {
  await page.goto('/tasks')
  const title = uniq('パネル編集')
  await createTask(page, title)
  await page.locator('[data-task-id]', { hasText: title }).first().click()
  const panel = page.locator('aside').last()

  // 優先度
  await panel.getByRole('button', { name: '優先度' }).click()
  await page.getByRole('menuitem', { name: '緊急' }).click()
  await expect(panel.getByRole('button', { name: '優先度' })).toContainText('緊急')

  // 期限
  await panel.getByRole('button', { name: '期限' }).click()
  await page.locator('input[type="date"]').fill('2026-08-15')
  await page.keyboard.press('Escape')
  await expect(panel.getByRole('button', { name: '期限' })).toContainText('8月15日')
})

test('ピークパネルで担当者を割り当てられる', async ({ page }) => {
  await page.goto('/tasks')
  const title = uniq('担当変更')
  await createTask(page, title)
  await page.locator('[data-task-id]', { hasText: title }).first().click()
  const panel = page.locator('aside').last()

  await panel.getByRole('button', { name: '担当者' }).click()
  await page.getByRole('button', { name: /佐藤 花子/ }).click()
  await page.keyboard.press('Escape')

  await expect(panel.getByRole('button', { name: '担当者' })).toContainText('佐藤 花子')
})
