import { expect, test } from '@playwright/test'
import { createTask, uniq } from './helpers'

test.describe.configure({ mode: 'serial' })

test('行を選択してSショートカットからステータスを変更できる', async ({ page }) => {
  await page.goto('/tasks')
  const title = uniq('S変更')
  const row = await createTask(page, title)

  await row.hover()
  await page.keyboard.press('s')
  await expect(page.getByPlaceholder('コマンドを入力または検索…')).toBeVisible()
  await page.getByRole('option', { name: '完了' }).click()

  // 反映確認: リロード後にピークパネルで完了を確認
  await page.reload()
  await page.locator('[data-task-id]', { hasText: title }).first().click()
  await expect(page.locator('aside').last()).toContainText('完了')
})

test('Aショートカットのパレットから担当者を割り当てられる', async ({ page }) => {
  await page.goto('/tasks')
  const title = uniq('A担当')
  const row = await createTask(page, title)

  await row.hover()
  await page.keyboard.press('a')
  await expect(page.getByPlaceholder('コマンドを入力または検索…')).toBeVisible()
  await page.getByRole('option', { name: /佐藤 花子/ }).click()
  await page.keyboard.press('Escape')

  await expect(row.getByTitle('佐藤 花子')).toHaveCount(1)
})
