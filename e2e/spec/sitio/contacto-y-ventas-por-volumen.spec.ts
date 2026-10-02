import { expect, test } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };

test.describe('[sitio] Contacto y ventas por volumen', () => {
  test('Correo de ventas', async ({ page }) => {
    await page.goto('/contacto/');
    const main = page.getByRole('main');
    const correo = main.getByRole('link', { name: site.contacto.email });
    await expect(correo).toHaveAttribute('href', `mailto:${site.contacto.email}`);
    await expect(main.getByText(site.contacto.ventasVolumen)).toBeVisible();
  });

  test('Enlaces a la tienda, la página oficial y el Instagram', async ({ page }) => {
    await page.goto('/contacto/');
    const main = page.getByRole('main');
    await expect(main.locator(`a[href="${site.mercadolibre.tienda}"]`)).toHaveCount(1);
    await expect(main.locator(`a[href="${site.mercadolibre.paginaOficial}"]`)).toHaveCount(1);
    await expect(main.locator(`a[href="${site.redes.instagram}"]`)).toHaveCount(1);
  });

  test('El footer repite el mailto', async ({ page }) => {
    await page.goto('/contacto/');
    await expect(page.getByRole('contentinfo').getByRole('link', { name: site.contacto.email })).toHaveAttribute(
      'href',
      `mailto:${site.contacto.email}`,
    );
  });
});
