import { expect, type Page } from '@playwright/test';

export async function esperarHidratacion(page: Page): Promise<void> {
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0, { timeout: 30000 });
}
