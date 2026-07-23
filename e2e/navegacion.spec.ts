import { test, expect } from '@playwright/test';

test.describe('navegación principal', () => {
  test('la home carga con h1 y logo de la marca', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Soluciones innovadoras en accesorios tech',
    );
    await expect(
      page.locator('header').getByRole('link', { name: /AGAS Soluciones Innovadoras — Inicio/ }),
    ).toBeVisible();
  });

  test('el nav de escritorio incluye el enlace a Guías', async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), 'el nav de escritorio no se muestra en mobile');
    await page.goto('/');
    await expect(
      page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Guías', exact: true }),
    ).toHaveAttribute('href', '/guias/');
  });

  test('el nav de escritorio incluye el enlace a Promociones', async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), 'el nav de escritorio no se muestra en mobile');
    await page.goto('/');
    await expect(
      page
        .getByRole('navigation', { name: 'Navegación principal' })
        .getByRole('link', { name: 'Promociones', exact: true }),
    ).toHaveAttribute('href', '/promociones/');
  });

  test('desde la home se llega al catálogo y a un producto', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Ver catálogo', exact: true }).click();
    await expect(page).toHaveURL(/\/productos\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Catálogo de productos');

    await page.locator('a[href="/productos/lamina-vidrio-nintendo-switch/"]').first().click();
    await expect(page).toHaveURL(/\/productos\/lamina-vidrio-nintendo-switch\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Lámina');
  });

  test('el 404 responde para una ruta inexistente', async ({ page }) => {
    const response = await page.goto('/esta-ruta-no-existe/');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Página no encontrada');
  });
});
