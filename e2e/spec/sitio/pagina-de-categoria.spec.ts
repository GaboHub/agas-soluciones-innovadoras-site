import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import matter from 'gray-matter';
import site from '../../../src/data/site.json' with { type: 'json' };
import { leerMetadatos } from '../_sitemap';
import { muestras } from '../_muestras';

const primerParrafo = (slug: string): string => {
  const { content } = matter(readFileSync(path.resolve(import.meta.dirname, `../../../content/paginas/${slug}.md`), 'utf-8'));
  const parrafo = content.split(/\n{2,}/).map((bloque) => bloque.trim()).find((bloque) => bloque && !bloque.startsWith('#'));
  if (!parrafo) throw new Error(`La página ${slug} no tiene párrafos`);
  return parrafo;
};

test.describe('[sitio] Página de categoría', () => {
  for (const categoria of site.categorias) {
    test(`Interlinking: ${categoria.slug}`, async ({ page }) => {
      await page.goto(`/categorias/${categoria.slug}/`);
      const main = page.getByRole('main');
      await expect(main.getByText(primerParrafo(categoria.slug), { exact: true })).toBeVisible();

      const fichas = muestras.fichas.filter((ficha) => ficha.categoria === categoria.slug);
      expect(fichas.length).toBeGreaterThan(0);
      const listadas = await main
        .locator('a[href^="/productos/"]')
        .evaluateAll((enlaces) => enlaces.map((enlace) => enlace.getAttribute('href')));
      expect([...new Set(listadas)].sort()).toEqual(fichas.map((ficha) => `/productos/${ficha.slug}/`).sort());

      for (const otra of site.categorias.filter((candidata) => candidata.slug !== categoria.slug)) {
        await expect(main.locator(`a[href="/categorias/${otra.slug}/"]`)).toBeVisible();
      }
      await expect(main.locator(`a[href="/categorias/${categoria.slug}/"]`)).toHaveCount(0);
    });

    test(`og:image es la primera imagen de su primera ficha: ${categoria.slug}`, async ({ page }) => {
      await page.goto(`/productos/${categoria.productos[0]}/`);
      const imagenDeLaFicha = (await leerMetadatos(page)).og.image;
      expect(imagenDeLaFicha).toBeTruthy();
      await page.goto(`/categorias/${categoria.slug}/`);
      expect((await leerMetadatos(page)).og.image).toBe(imagenDeLaFicha);
    });
  }
});
