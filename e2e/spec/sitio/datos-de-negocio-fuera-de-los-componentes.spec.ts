import { expect, test } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };
import { muestras } from '../_muestras';

test.describe('[sitio] Datos de negocio fuera de los componentes', () => {
  test('Textos de CTA: el CTA principal de la ficha es ctaFicha', async ({ page }) => {
    await page.goto(`/productos/${muestras.fichaSimple.slug}/`);
    const cta = page.getByRole('main').getByRole('link', { name: site.ctaFicha, exact: true });
    await expect(cta).toHaveCount(1);
    await expect(cta).toHaveAttribute('href', /^https:\/\/articulo\.mercadolibre\.cl\//);
  });

  test('Textos de CTA: contacto usa ctaHeader para la tienda y ctaPaginaOficial para la página oficial', async ({ page }) => {
    await page.goto('/contacto/');
    const main = page.getByRole('main');
    expect(site.ctaPaginaOficial).toEqual(expect.any(String));
    await expect(main.locator(`a[href="${site.mercadolibre.tienda}"]`)).toHaveText(site.ctaHeader);
    await expect(main.locator(`a[href="${site.mercadolibre.paginaOficial}"]`)).toHaveText(site.ctaPaginaOficial);
  });
});
