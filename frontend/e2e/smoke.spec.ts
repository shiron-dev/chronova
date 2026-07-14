import { expect, test, type Page } from '@playwright/test'

// 一意なタイトルで実行ごとの衝突を避ける(DBは実行間で共有されうる)
const stamp = Date.now().toString(36)
const titleA = `E2Eタスク-A-${stamp}`
const titleB = `E2Eタスク-B-${stamp}`
const titleBEdited = `${titleB}-編集済`

test.describe.configure({ mode: 'serial' })

async function createTaskViaShortcut(page: Page, title: string) {
  await page.keyboard.press('c')
  const input = page.getByPlaceholder('タスクのタイトルを入力…')
  await expect(input).toBeVisible()
  await input.fill(title)
  await page.keyboard.press('Enter')
  // 楽観挿入が確定し、実IDが割り当てられるまで待つ
  const row = page.locator('[data-task-id]', { hasText: title })
  await expect(row).toContainText(/CHR-\d+/)
}

test('アプリが起動しシードデータが表示される', async ({ page }) => {
  await page.goto('/tasks')
  await expect(page.locator('h1')).toContainText('すべてのタスク')
  await expect(page.locator('aside').first()).toContainText('プロジェクト')
  await expect(page.locator('[data-task-id]').first()).toBeVisible()
})

test('Cキーの新規タスクモーダルからタスクを作成できる', async ({ page }) => {
  await page.goto('/tasks')
  await page.locator('[data-task-id]').first().waitFor()
  await createTaskViaShortcut(page, titleA)
  await createTaskViaShortcut(page, titleB)
})

test('ボードビューでキーボードD&Dでき順序が永続化される', async ({ page }) => {
  await page.goto('/tasks?view=board')
  const cardB = page.locator(`[data-sortable-id]`, { hasText: titleB })
  await cardB.waitFor()

  // Space でリフト → ↑ で1つ上へ → Space でドロップ(A の上に B が来る)
  // ※センサーのリスナー登録は非同期のため、リフト完了を待ってから操作する
  await cardB.focus()
  await page.keyboard.press('Space')
  await expect(cardB).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(200)
  await page.keyboard.press('ArrowUp')
  await page.waitForTimeout(200)
  await page.keyboard.press('Space')

  const orderCheck = async () => {
    const texts = await page
      .locator('[data-task-id]')
      .evaluateAll((els) => els.map((el) => (el as HTMLElement).textContent ?? ''))
    const iA = texts.findIndex((t) => t.includes(titleA))
    const iB = texts.findIndex((t) => t.includes(titleB))
    expect(iA).toBeGreaterThanOrEqual(0)
    expect(iB).toBeGreaterThanOrEqual(0)
    expect(iB).toBeLessThan(iA)
  }
  await expect(async () => await orderCheck()).toPass({ timeout: 5_000 })

  // リロードしてもサーバー側で順序が保持されている
  await page.reload()
  await page.locator(`[data-sortable-id]`, { hasText: titleB }).waitFor()
  await orderCheck()
})

test('リスト行からステータスを変更できる', async ({ page }) => {
  await page.goto('/tasks')
  const row = page.locator('[data-task-id]', { hasText: titleA })
  await row.getByLabel('ステータス').click()
  await page.getByRole('menuitem', { name: '進行中' }).click()

  // ピークパネルでステータスが反映されていることを確認
  await page.reload()
  const rowAfter = page.locator('[data-task-id]', { hasText: titleA })
  await rowAfter.click()
  await expect(page.locator('aside').last()).toContainText('進行中')
})

test('コマンドパレットからメンバーページへ移動できる', async ({ page }) => {
  await page.goto('/tasks')
  await page.keyboard.press('ControlOrMeta+k')
  const input = page.getByPlaceholder('コマンドを入力または検索…')
  await expect(input).toBeVisible()
  await input.fill('メンバー')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/members/)
  // AIエージェントのタイプバッジが表示される
  await expect(page.getByText('AIエージェント').first()).toBeVisible()
})

test('ピークパネルでタイトルをインライン編集できる', async ({ page }) => {
  await page.goto('/tasks')
  const row = page.locator('[data-task-id]', { hasText: titleB })
  await row.click()
  const panel = page.locator('aside').last()
  const titleBox = panel.getByPlaceholder('タスクのタイトルを入力…')
  await expect(titleBox).toHaveValue(titleB)
  await titleBox.fill(titleBEdited)
  await page.keyboard.press('Enter')
  // パネル背後のリスト行にも即時反映される(楽観的更新)
  await expect(page.locator('[data-task-id]', { hasText: titleBEdited }).first()).toBeVisible()
})

test('タスクを削除できる', async ({ page }) => {
  for (const title of [titleA, titleBEdited]) {
    await page.goto('/tasks')
    const row = page.locator('[data-task-id]', { hasText: title }).first()
    await row.click()
    const panel = page.locator('aside').last()
    await panel.getByLabel('削除').click()
    await page.getByRole('dialog').getByRole('button', { name: '削除' }).click()
    await expect(page.locator('[data-task-id]', { hasText: title })).toHaveCount(0)
  }
})
