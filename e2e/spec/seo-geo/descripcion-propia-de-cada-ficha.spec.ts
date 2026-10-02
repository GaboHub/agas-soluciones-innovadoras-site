import { expect, test } from '@playwright/test';
import textos from '../../../src/data/textos-productos.json' with { type: 'json' };
import { bloquesJsonLd } from '../_jsonld';
import { muestras } from '../_muestras';

const textoDe = (slug: string) => (textos as Record<string, { descripcion: string; metaDescription: string }>)[slug];
const normalizar = (texto: string) => texto.replace(/\s+/g, ' ').trim();

test.describe('[seo-geo] Descripción propia de cada ficha', () => {
  test('Meta de la ficha', async ({ page }) => {
    expect(muestras.fichas.length).toBeGreaterThan(0);
    for (const ficha of muestras.fichas) {
      await page.goto(`/productos/${ficha.slug}/`);
      const meta = await page.locator('meta[name="description"]').getAttribute('content');
      expect(meta, ficha.slug).toBe(textoDe(ficha.slug).metaDescription);
    }
  });

  test('La descripción es el texto visible y la description del JSON-LD', async ({ page }) => {
    for (const ficha of muestras.fichas) {
      await page.goto(`/productos/${ficha.slug}/`);
      const { descripcion } = textoDe(ficha.slug);
      const visible = normalizar(await page.locator('main').innerText());
      expect(visible, ficha.slug).toContain(normalizar(descripcion));
      const producto = (await bloquesJsonLd(page)).find((bloque) => ['Product', 'ProductGroup'].includes(bloque['@type']));
      expect(producto?.description, ficha.slug).toBe(descripcion);
    }
  });
});
