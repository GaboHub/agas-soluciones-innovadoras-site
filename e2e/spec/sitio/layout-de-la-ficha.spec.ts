import { expect, test } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };
import { muestras } from '../_muestras';

test.describe('[sitio] Layout de la ficha', () => {
  test('Escritorio', async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), 'el layout de dos columnas se mide a 1280 px');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/productos/${muestras.fichaSimple.slug}/`);
    const main = page.getByRole('main');
    const galeria = await main.getByRole('img', { name: /^Foto 1 de / }).first().boundingBox();
    const precio = await main.getByText(/^\$\d{1,3}(\.\d{3})*$/).first().boundingBox();
    const cta = await main.getByRole('link', { name: site.ctaFicha, exact: true }).boundingBox();
    expect(galeria).not.toBeNull();
    expect(precio).not.toBeNull();
    expect(cta).not.toBeNull();
    for (const derecha of [precio!, cta!]) {
      expect(derecha.x).toBeGreaterThanOrEqual(galeria!.x + galeria!.width);
      expect(derecha.y).toBeLessThan(galeria!.y + galeria!.height);
    }
  });
});
