import { expect, test } from '@playwright/test';
import { bloquesJsonLd } from '../_jsonld';
import { muestras } from '../_muestras';

test.describe('[seo-geo] Miga de pan', () => {
  test('Miga visible igual al JSON-LD', async ({ page }) => {
    expect(muestras.fichas.length).toBeGreaterThan(0);
    for (const ficha of muestras.fichas) {
      await page.goto(`/productos/${ficha.slug}/`);
      const visibles = await page
        .locator('nav[aria-label="Ruta de navegación"] li:not([aria-hidden="true"])')
        .allTextContents();
      const lista = (await bloquesJsonLd(page)).find((bloque) => bloque['@type'] === 'BreadcrumbList');
      expect(lista, ficha.slug).toBeDefined();
      const elementos = lista!.itemListElement as { position: number; name: string; item?: string }[];
      expect(elementos.map((elemento) => elemento.name), ficha.slug).toEqual(visibles.map((texto) => texto.trim()));
      expect(visibles.length, ficha.slug).toBe(3);
      expect(elementos.map((elemento) => elemento.position), ficha.slug).toEqual([1, 2, 3]);
      expect(elementos[0].name, ficha.slug).toBe('Inicio');
      expect(elementos[2].name, ficha.slug).toBe(ficha.titulo);
      expect(elementos[0].item, ficha.slug).toMatch(/^https:\/\/agassoluciones\.cl\//);
      expect(elementos[1].item, ficha.slug).toMatch(/^https:\/\/agassoluciones\.cl\//);
      expect(elementos[2], ficha.slug).not.toHaveProperty('item');
    }
  });
});
