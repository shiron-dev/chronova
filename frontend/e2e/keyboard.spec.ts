import { expect, test } from '@playwright/test'

test('J/Kで選択を移動しEnterでピークパネルを開く', async ({ page }) => {
  await page.goto('/tasks')
  await page.locator('[data-task-id]').first().waitFor()

  // J で選択を下へ動かし、Enter で開く
  await page.keyboard.press('j')
  await page.keyboard.press('j')
  await page.keyboard.press('Enter')

  await expect(page).toHaveURL(/task=/)
  await expect(page.locator('aside').last()).toBeVisible()
})

test('Escでピークパネルを閉じる', async ({ page }) => {
  await page.goto('/tasks')
  await page.locator('[data-task-id]').first().click()
  await expect(page).toHaveURL(/task=/)

  await page.keyboard.press('Escape')
  await expect(page).not.toHaveURL(/task=/)
})
