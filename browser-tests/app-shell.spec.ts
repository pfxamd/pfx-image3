import { expect, test } from '@playwright/test';

test('app uploads and converts an image through the worker core', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Convert images in your browser.' }),
  ).toBeVisible();

  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 24;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');

    context.fillStyle = '#ef476f';
    context.fillRect(0, 0, 16, 24);
    context.fillStyle = '#118ab2';
    context.fillRect(16, 0, 16, 24);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error('PNG fixture creation failed'));
      }, 'image/png');
    });

    const file = new File([blob], 'workspace-fixture.png', {
      type: 'image/png',
    });

    const transfer = new DataTransfer();
    transfer.items.add(file);

    const dropZone = document.querySelector<HTMLElement>(
      '[data-testid="drop-zone"]',
    );
    if (!dropZone) throw new Error('Drop zone unavailable');

    dropZone.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
  });

  await expect(page.getByText('workspace-fixture.png')).toBeVisible();
  await page.getByRole('button', { name: 'Convert all' }).click();

  await expect(page.getByText('Done')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
