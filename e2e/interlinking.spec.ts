import { test, expect } from '@playwright/test';

test.describe('interlinking', () => {
  test('la home tiene exactamente 3 tarjetas de categoría', async ({ page }) => {
    await page.goto('/');
    const tarjetas = page.locator('#categorias a[href^="/categorias/"]');
    await expect(tarjetas).toHaveCount(3);
    await expect(tarjetas.nth(0)).toHaveAttribute('href', '/categorias/nintendo-switch/');
    await expect(tarjetas.nth(1)).toHaveAttribute('href', '/categorias/playstation-5/');
    await expect(tarjetas.nth(2)).toHaveAttribute('href', '/categorias/audio/');
  });

  test('home → categoría → producto', async ({ page }) => {
    await page.goto('/');
    await page.locator('#categorias a[href="/categorias/nintendo-switch/"]').click();
    await expect(page).toHaveURL(/\/categorias\/nintendo-switch\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Nintendo Switch');

    await page.locator('a[href="/productos/lamina-vidrio-nintendo-switch/"]').first().click();
    await expect(page).toHaveURL(/\/productos\/lamina-vidrio-nintendo-switch\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Lámina');
  });

  test('producto → categoría por la miga de pan', async ({ page }) => {
    await page.goto('/productos/audifonos-usb-c-manos-libres/');
    await page
      .getByRole('navigation', { name: 'Ruta de navegación' })
      .getByRole('link', { name: 'Audio' })
      .click();
    await expect(page).toHaveURL(/\/categorias\/audio\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Audio');
  });

  test('la categoría lista sus productos y enlaza a las otras categorías', async ({ page }) => {
    await page.goto('/categorias/audio/');
    const productos = page.locator('a[href^="/productos/"]');
    expect(await productos.count()).toBeGreaterThanOrEqual(1);
    await expect(page.locator('a[href="/categorias/nintendo-switch/"]').first()).toBeVisible();
    await expect(page.locator('a[href="/categorias/playstation-5/"]').first()).toBeVisible();
  });

  test('el footer enlaza catálogo, categorías y términos', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.locator('a[href="/productos/"]')).toBeVisible();
    await expect(footer.locator('a[href="/categorias/nintendo-switch/"]')).toBeVisible();
    await expect(footer.locator('a[href="/terminos-y-condiciones/"]')).toBeVisible();
    await expect(footer.locator('a[href="/preguntas-frecuentes/"]')).toBeVisible();
  });
});
