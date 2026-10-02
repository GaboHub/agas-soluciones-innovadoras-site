import { expect, test } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };
import { esperarHidratacion } from '../_hidratacion';

const slugsVisibles = async (page: import('@playwright/test').Page) =>
  (await page.locator('main a[href^="/productos/"]').evaluateAll((enlaces) => enlaces.map((enlace) => enlace.getAttribute('href')!)))
    .filter((href) => href !== '/productos/')
    .map((href) => href.split('/')[2]);

test.describe('[sitio] Orden de productos', () => {
  test('Catálogo', async ({ page }) => {
    await page.goto('/productos/');
    await esperarHidratacion(page);
    expect(await slugsVisibles(page)).toEqual(site.categorias.flatMap((categoria) => categoria.productos));
  });

  test('Cada categoría sigue su orden en site.json', async ({ page }) => {
    for (const categoria of site.categorias) {
      await page.goto(`/categorias/${categoria.slug}/`);
      expect(await slugsVisibles(page), categoria.slug).toEqual(categoria.productos);
    }
  });
});
