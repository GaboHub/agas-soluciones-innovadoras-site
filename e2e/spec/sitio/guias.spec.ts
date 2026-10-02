import { expect, test } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };
import { muestras } from '../_muestras';

const guias = muestras.guias as { slug: string; titulo: string; metaTitulo?: string; productosRelacionados: string[] }[];

test.describe('[sitio] Guías', () => {
  test('Producto citado', async ({ page }) => {
    const citas = guias.flatMap((guia) => guia.productosRelacionados.map((producto) => ({ guia, producto })));
    expect(citas.length).toBeGreaterThan(0);
    for (const { guia, producto } of citas) {
      await page.goto(`/productos/${producto}/`);
      const seccion = page.locator('section').filter({
        has: page.getByRole('heading', { level: 2, name: 'Guías que te pueden servir' }),
      });
      await expect(seccion.locator(`a[href="/guias/${guia.slug}/"]`), `${producto} cita ${guia.slug}`).toHaveCount(1);
    }
  });

  test('Cada guía se publica con un h1, su título y enlaces a sus productos', async ({ page }) => {
    for (const guia of guias) {
      await page.goto(`/guias/${guia.slug}/`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(guia.titulo);
      await expect(page).toHaveTitle(`${guia.metaTitulo ?? guia.titulo} | ${site.nombre}`);
      for (const producto of guia.productosRelacionados) {
        await expect(page.getByRole('main').locator(`a[href="/productos/${producto}/"]`).first(), guia.slug).toBeVisible();
      }
    }
  });

  test('El listado enlaza a todas las guías', async ({ page }) => {
    await page.goto('/guias/');
    for (const guia of guias) {
      await expect(page.getByRole('main').locator(`a[href="/guias/${guia.slug}/"]`).first(), guia.slug).toBeVisible();
    }
  });
});
