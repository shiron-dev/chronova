import { expect, test } from '@playwright/test'
import { uniq } from './helpers'

test.describe.configure({ mode: 'serial' })

async function openCreateMember(page: import('@playwright/test').Page) {
  await page.goto('/members')
  await page.getByRole('button', { name: 'メンバーを追加' }).click()
}

test('シードのAIエージェントがバッジ付きで表示される', async ({ page }) => {
  await page.goto('/members')
  // 人間 / AIエージェント のセクションが見える
  await expect(page.getByText('人間').first()).toBeVisible()
  await expect(page.getByText('AIエージェント').first()).toBeVisible()
  // シードの既定メンバー数(6行)
  await expect(page.getByTestId('member-row')).toHaveCount(6)
})

test('人間メンバーを作成できる', async ({ page }) => {
  await openCreateMember(page)
  const name = uniq('人間')
  await page.getByPlaceholder('メンバー名').fill(name)
  // デフォルトで人間が選択されている
  await page.getByRole('dialog').getByRole('button', { name: '作成' }).click()
  await expect(page.getByTestId('member-row').filter({ hasText: name })).toBeVisible()
})

test('AIエージェントを作成するとエージェントバッジが付く', async ({ page }) => {
  await openCreateMember(page)
  const name = uniq('Bot')
  await page.getByPlaceholder('メンバー名').fill(name)
  // 種別を AIエージェント に切り替え
  await page.getByRole('dialog').getByRole('button', { name: 'AIエージェント' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '作成' }).click()

  const row = page.getByTestId('member-row').filter({ hasText: name })
  await expect(row).toBeVisible()
  await expect(row.getByText('AIエージェント')).toBeVisible()
})

test('メンバーを編集・削除できる', async ({ page }) => {
  await openCreateMember(page)
  const name = uniq('編集対象')
  await page.getByPlaceholder('メンバー名').fill(name)
  await page.getByRole('dialog').getByRole('button', { name: '作成' }).click()

  const row = page.getByTestId('member-row').filter({ hasText: name })
  await expect(row).toBeVisible()

  // 編集
  await row.getByRole('button', { name: '編集' }).click()
  const renamed = `${name}-改`
  await page.getByPlaceholder('メンバー名').fill(renamed)
  await page.getByRole('dialog').getByRole('button', { name: '保存' }).click()
  const renamedRow = page.getByTestId('member-row').filter({ hasText: renamed })
  await expect(renamedRow).toBeVisible()

  // 削除
  await renamedRow.getByRole('button', { name: '削除' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '削除' }).click()
  await expect(page.getByTestId('member-row').filter({ hasText: renamed })).toHaveCount(0)
})
