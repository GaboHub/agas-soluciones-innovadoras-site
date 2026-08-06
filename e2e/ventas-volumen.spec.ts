import { test, expect } from '@playwright/test';
import site from '../src/data/site.json' with { type: 'json' };

test.describe('ventas por volumen', () => {
  test('el footer incluye el mailto de ventas por volumen con el email correcto', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    const mailto = footer.locator(`a[href="mailto:${site.contacto.email}"]`);
    await expect(mailto).toBeVisible();
    await expect(mailto).toHaveText(site.contacto.email);
  });

  test('la página de contacto incluye el mailto de ventas por volumen con el email correcto', async ({ page }) => {
    await page.goto('/contacto/');
    const main = page.locator('main');
    const mailto = main.locator(`a[href="mailto:${site.contacto.email}"]`);
    await expect(mailto).toBeVisible();
    await expect(mailto).toHaveText(site.contacto.email);
  });
});
