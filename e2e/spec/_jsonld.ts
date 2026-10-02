import type { Page } from '@playwright/test';

export const bloquesJsonLd = async (page: Page): Promise<Record<string, any>[]> => {
  const textos = await page.locator('script[type="application/ld+json"]').allTextContents();
  return textos.map((texto) => JSON.parse(texto));
};
