import { expect, test } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };
import { bloquesJsonLd } from '../_jsonld';
import { muestras } from '../_muestras';

const listados = [
  { ruta: '/productos/', slugs: () => muestras.fichas.map((ficha) => ficha.slug as string) },
  ...site.categorias.map((categoria) => ({
    ruta: `/categorias/${categoria.slug}/`,
    slugs: () => categoria.productos,
  })),
];

test.describe('[seo-geo] ItemList en listados', () => {
  for (const { ruta, slugs } of listados) {
    test(`Orden visible en ${ruta}`, async ({ page }) => {
      await page.goto(ruta);
      const lista = (await bloquesJsonLd(page)).find((bloque) => bloque['@type'] === 'ItemList');
      expect(lista, ruta).toBeDefined();
      const elementos = lista!.itemListElement as { '@type': string; position: number; url: string }[];
      const visibles = await page.locator('main a[href^="/productos/"]').evaluateAll((enlaces) =>
        enlaces.map((enlace) => enlace.getAttribute('href')),
      );
      expect(visibles.length, ruta).toBeGreaterThan(0);
      expect(elementos.map((elemento) => new URL(elemento.url).pathname), ruta).toEqual(visibles);
      expect(elementos.map((elemento) => elemento.position), ruta).toEqual(visibles.map((_, indice) => indice + 1));
      for (const elemento of elementos) {
        expect(elemento['@type'], ruta).toBe('ListItem');
        expect(elemento.url, ruta).toMatch(/^https:\/\/agassoluciones\.cl\/productos\/[a-z0-9-]+\/$/);
      }
      expect(elementos.map((elemento) => new URL(elemento.url).pathname.split('/')[2]).sort(), ruta).toEqual(
        [...slugs()].sort(),
      );
    });
  }
});
