import { test, expect } from '@playwright/test';

test.describe('prueba social de Mercado Libre', () => {
  test('la home muestra el sello de reputación verde en el hero', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Reputación verde', { exact: true })).toBeVisible();
  });

  test('la home muestra reseñas destacadas con enlace a su producto', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Lo que dicen nuestros compradores' }),
    ).toBeVisible();

    const tarjetas = page.locator('figure', {
      hasText: 'Compra verificada en Mercado Libre',
    });
    expect(await tarjetas.count()).toBeGreaterThanOrEqual(4);

    const cta = page.getByRole('link', { name: 'Ver nuestra tienda en Mercado Libre' });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', /mercadolibre\.cl/);
  });

  test('la home no marca reseñas en JSON-LD', async ({ page }) => {
    await page.goto('/');
    const bloques = await page.locator('script[type="application/ld+json"]').allTextContents();
    for (const bloque of bloques) {
      expect(bloque).not.toContain('aggregateRating');
      expect(bloque).not.toContain('"Review"');
    }
  });

  test('un producto con reviews muestra promedio, distribución y comentarios', async ({ page }) => {
    await page.goto('/productos/pack-2-laminas-vidrio-switch-oled/');
    await expect(page.getByRole('heading', { name: 'Opiniones de compradores' })).toBeVisible();
    await expect(page.getByText(/calificaciones en Mercado Libre/)).toBeVisible();
    const comentarios = page.locator('figure', { hasText: 'Compra verificada en Mercado Libre' });
    expect(await comentarios.count()).toBeGreaterThan(0);
  });
});
