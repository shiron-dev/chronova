import { expect, test } from '@playwright/test'

test('操作メンバー未選択のマイタスクは選択を促す', async ({ page }) => {
  await page.goto('/my')
  await expect(page.getByText('操作メンバーを選択', { exact: false })).toBeVisible()
})

test('操作メンバーを切り替えるとマイタスクが担当分に絞り込まれる', async ({ page }) => {
  await page.goto('/my')

  // サイドバー下部の操作メンバー切替を開く(初期は「操作メンバー」表示)
  await page.getByRole('button', { name: /操作メンバー/ }).click()
  await page.getByRole('menuitem', { name: /佐藤 花子/ }).click()

  // 担当タスクが表示される(シードで佐藤 花子に複数割当あり)
  await expect(page.locator('[data-task-id]').first()).toBeVisible()

  // 表示中の全タスクに佐藤 花子のアバターが含まれる(=絞り込みが効いている)
  const rows = page.locator('[data-task-id]')
  const count = await rows.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    await expect(rows.nth(i).getByTitle('佐藤 花子')).toHaveCount(1)
  }
})
