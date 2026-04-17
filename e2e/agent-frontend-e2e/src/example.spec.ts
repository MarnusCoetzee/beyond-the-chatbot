import { test, expect } from '@playwright/test';

test('shows the landing experience', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /consensus lab/i }),
  ).toBeVisible();
  await expect(page.getByText(/multi-agent ai deliberation/i)).toBeVisible();
});
