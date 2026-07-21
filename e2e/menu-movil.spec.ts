import { test, expect } from '@playwright/test';

test.describe('menú móvil', () => {
  test.skip(({ isMobile }) => !isMobile, 'solo aplica al project mobile');

  test('el nav de escritorio no es visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeHidden();
  });

  test('el botón hamburguesa despliega el menú', async ({ page }) => {
    await page.goto('/');
    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
    await expect(menu).toBeHidden();
    await page.locator('#menu-movil summary').click();
    await expect(menu).toBeVisible();
  });

  test('al tocar un enlace navega a la página correcta', async ({ page }) => {
    await page.goto('/');
    await page.locator('#menu-movil summary').click();
    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
    await menu.getByRole('link', { name: 'Productos', exact: true }).click();
    await expect(page).toHaveURL(/\/productos\/$/);
  });

  test('el menú móvil incluye el enlace a Guías', async ({ page }) => {
    await page.goto('/');
    await page.locator('#menu-movil summary').click();
    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
    await expect(menu.getByRole('link', { name: 'Guías', exact: true })).toHaveAttribute('href', '/guias/');
  });

  test('al reabrir y hacer click fuera, se cierra', async ({ page }) => {
    await page.goto('/');
    const menu = page.getByRole('navigation', { name: 'Navegación móvil' });
    await page.locator('#menu-movil summary').click();
    await expect(menu).toBeVisible();
    await page.locator('body').click({ position: { x: 5, y: 400 } });
    await expect(menu).toBeHidden();
  });
});
