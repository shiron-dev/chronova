import { expect, type Page } from '@playwright/test'

let seq = 0

/** 実行内で衝突しない一意な文字列を返す。 */
export function uniq(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}

/** C ショートケットの新規タスクモーダルからタスクを作成し、確定した行を返す。 */
export async function createTask(page: Page, title: string) {
  await page.keyboard.press('c')
  const input = page.getByPlaceholder('タスクのタイトルを入力…')
  await expect(input).toBeVisible()
  await input.fill(title)
  await page.keyboard.press('Enter')
  const row = page.locator('[data-task-id]', { hasText: title }).first()
  // 楽観挿入が確定し実IDが割り当てられるまで待つ
  await expect(row).toContainText(/CHR-\d+/)
  return row
}

/** サイドバーからプロジェクトを作成する。 */
export async function createProject(page: Page, name: string) {
  await page.getByRole('button', { name: '新規プロジェクト' }).click()
  await page.getByPlaceholder('プロジェクト名').fill(name)
  await page.getByRole('dialog').getByRole('button', { name: '作成' }).click()
  await expect(page.getByTestId('project-item').filter({ hasText: name })).toBeVisible()
}
