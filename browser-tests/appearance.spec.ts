import { expect, test } from '@playwright/test';

test('appearance toggle persists and desktop workspace stays within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');

  const workspace = page.locator('[data-theme]');
  await expect(workspace).toBeVisible();
  const initial = await workspace.getAttribute('data-theme');
  expect(['dark', 'light']).toContain(initial);

  const next = initial === 'dark' ? 'light' : 'dark';
  await page.getByRole('button', { name: initial === 'dark' ? 'Switch to light mode' : 'Switch to dark mode' }).click();
  await expect(workspace).toHaveAttribute('data-theme', next);
  await expect(page.getByRole('button', { name: next === 'light' ? 'Switch to dark mode' : 'Switch to light mode' })).toBeVisible();

  await page.reload();
  await expect(page.locator('[data-theme]')).toHaveAttribute('data-theme', next);

  const bounds = await page.evaluate(() => ({
    viewportHeight: document.documentElement.clientHeight,
    documentHeight: document.documentElement.scrollHeight,
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(bounds.documentHeight).toBeLessThanOrEqual(bounds.viewportHeight + 1);
  expect(bounds.documentWidth).toBeLessThanOrEqual(bounds.viewportWidth + 1);
});
