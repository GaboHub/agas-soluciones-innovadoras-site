import { test, expect } from '@playwright/test';
import { getCampanasPublicables } from '../src/lib/promociones';

const campanasPublicables = getCampanasPublicables();

async function extraerJsonLd(page: import('@playwright/test').Page) {
  const bloques = await page.locator('script[type="application/ld+json"]').allTextContents();
  return bloques.map((bloque) => JSON.parse(bloque));
}

test.describe('promociones', () => {
  test('hay exactamente un h1', async ({ page }) => {
    await page.goto('/promociones/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('hay un SaleEvent por cada campaña publicable, con las fechas del JSON', async ({ page }) => {
    if (campanasPublicables.length === 0) {
      test.skip(true, 'no hay campañas publicables en promociones.json a la fecha de build');
      return;
    }
    await page.goto('/promociones/');
    const bloquesJsonLd = await extraerJsonLd(page);
    const saleEvents = bloquesJsonLd.filter((entrada) => entrada['@type'] === 'SaleEvent');
    expect(saleEvents.length).toBe(campanasPublicables.length);
    for (const saleEvent of saleEvents) {
      const campanaCorrespondiente = campanasPublicables.find(
        (campana) => campana.desde === saleEvent.startDate && campana.hasta === saleEvent.endDate,
      );
      expect(campanaCorrespondiente).toBeDefined();
    }
  });
});
