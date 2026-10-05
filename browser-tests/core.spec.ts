import { expect, test } from '@playwright/test';

test('real codecs pass the full JPG/PNG/WebP conversion matrix', async ({ page, browserName }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/browser-test/');
  await page.waitForFunction(() => typeof (window as any).runImage3BrowserSuite === 'function');

  const report = await page.evaluate(async () => {
    return await (window as any).runImage3BrowserSuite();
  });

  expect(report.matrix).toHaveLength(9);
  expect(report.matrix).toEqual([
    'jpeg->jpeg',
    'jpeg->png',
    'jpeg->webp',
    'png->jpeg',
    'png->png',
    'png->webp',
    'webp->jpeg',
    'webp->png',
    'webp->webp',
  ]);
  expect(report.workerTargets).toEqual(['jpeg', 'png', 'webp']);
  expect(report.batchCount).toBe(3);
  expect(report.alpha.png).toBe(0);
  expect(report.alpha.webp).toBe(0);
  expect(report.alpha.jpegBackgroundDistance).toBeLessThanOrEqual(45);
  expect(report.quality.jpegLow).toBeLessThan(report.quality.jpegHigh);
  expect(report.quality.webpLow).toBeLessThan(report.quality.webpHigh);
  expect(consoleErrors, `${browserName} emitted console errors`).toEqual([]);
});
