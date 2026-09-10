import { test, expect } from '@playwright/test';
import { esperarHidratacion } from './hidratacion';

test.describe('buscador del catálogo', () => {
  test('muestra los 24 productos sin búsqueda', async ({ page }) => {
    await page.goto('/productos/');
    await esperarHidratacion(page);
    await expect(page.locator('main li a[href^="/productos/"]')).toHaveCount(24);
  });

  test('buscar "oled" filtra solo los productos OLED', async ({ page }) => {
    await page.goto('/productos/');
    await esperarHidratacion(page);
    await page.getByPlaceholder(/Busca por producto/).fill('oled');
    const tarjetas = page.locator('main li a[href^="/productos/"]');
    await expect
      .poll(async () => tarjetas.count())
      .toBeLessThan(24);
    const cantidad = await tarjetas.count();
    expect(cantidad).toBeGreaterThanOrEqual(1);
    for (let indice = 0; indice < cantidad; indice += 1) {
      await expect(tarjetas.nth(indice)).toContainText(/OLED/i);
    }
  });

  test('la búsqueda ignora tildes y mayúsculas', async ({ page }) => {
    await page.goto('/productos/');
    await esperarHidratacion(page);
    await page.getByPlaceholder(/Busca por producto/).fill('LAMINA');
    const tarjetas = page.locator('main li a[href^="/productos/"]');
    expect(await tarjetas.count()).toBeGreaterThanOrEqual(1);
    await expect(tarjetas.first()).toContainText(/Lámina/);
  });

  test('encuentra familias por atributos de diseño', async ({ page }) => {
    await page.goto('/productos/');
    await esperarHidratacion(page);
    await page.getByPlaceholder(/Busca por producto/).fill('camo urbano');
    const tarjetas = page.locator('main li a[href^="/productos/"]');
    expect(await tarjetas.count()).toBeGreaterThanOrEqual(1);
    await expect(
      page.locator('main li a[href="/productos/fundas-silicona-grips-control-ps5/"]'),
    ).toHaveCount(1);
  });

  test('sin resultados muestra mensaje y vuelta al catálogo completo', async ({ page }) => {
    await page.goto('/productos/');
    await esperarHidratacion(page);
    await page.getByPlaceholder(/Busca por producto/).fill('zzz-no-existe');
    await expect(page.getByText('No encontramos productos para tu búsqueda')).toBeVisible();
    await page.getByRole('button', { name: 'Ver catálogo completo' }).click();
    await expect(page.locator('main li a[href^="/productos/"]')).toHaveCount(24);
  });
});
