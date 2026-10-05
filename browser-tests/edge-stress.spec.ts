import { expect, test } from '@playwright/test';

test('edge cases, cancellation, retry, stress and benchmark pass', async ({ page, browserName }) => {
  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/browser-test/');
  await page.waitForFunction(
    () => typeof (window as any).runImage3EdgeStressSuite === 'function',
  );

  const report = await page.evaluate(async () => {
    return await (window as any).runImage3EdgeStressSuite();
  });

  expect(report.corrupted).toEqual(['UNSUPPORTED_FORMAT', 'DECODE_FAILED']);
  expect(report.cancelled).toBe(true);
  expect(report.retryAttempts).toBe(2);
  expect(report.stress.items).toBe(6);
  expect(report.stress.width).toBe(1280);
  expect(report.stress.height).toBe(960);
  expect(report.stress.estimatedWorkingSetBytes).toBeGreaterThan(14_000_000);

  for (const format of ['jpeg', 'png', 'webp'] as const) {
    expect(report.benchmark[format].durationMs).toBeGreaterThanOrEqual(0);
    expect(report.benchmark[format].outputBytes).toBeGreaterThan(0);
  }

  console.log(`[${browserName}] PFx Image3 benchmark`, report.benchmark);
  const unexpectedConsoleErrors = consoleErrors.filter(
    (message) => !message.includes('JPEG datastream contains no image'),
  );
  expect(
    unexpectedConsoleErrors,
    `${browserName} emitted unexpected console errors`,
  ).toEqual([]);
});
