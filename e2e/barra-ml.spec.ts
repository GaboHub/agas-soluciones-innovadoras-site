import { test, expect } from '@playwright/test';

test.describe('barra móvil de Mercado Libre', () => {
  test('en mobile la barra es visible y apunta a la tienda; la burbuja queda oculta', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'la barra solo se muestra en el project mobile');
    await page.goto('/');

    const barra = page.locator('#barra-mercadolibre');
    await expect(barra).toBeVisible();

    const link = barra.getByRole('link');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(link).toHaveAttribute('href', /perfil\.mercadolibre\.cl/);

    await expect(page.locator('#burbuja-mercadolibre')).toBeHidden();
  });

  test('en escritorio la barra no es visible y la burbuja sí', async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), 'la comparación aplica solo al project desktop');
    await page.goto('/');

    await expect(page.locator('#barra-mercadolibre')).toBeHidden();
    await expect(page.locator('#burbuja-mercadolibre')).toBeVisible();
  });
});
