import { expect, test } from '@playwright/test';
import { leerMetadatos, rutaDe, urlsDelSitemap } from '../_sitemap';

test.describe('[seo-geo] Títulos y descripciones únicos', () => {
  test('Recorrido del sitemap', async ({ page, request }) => {
    const urls = await urlsDelSitemap(request);
    expect(urls.length).toBeGreaterThan(1);
    const titulos = new Set<string>();
    const descripciones = new Set<string>();
    for (const url of urls) {
      await page.goto(rutaDe(url));
      const { title, description } = await leerMetadatos(page);
      expect(titulos.has(title), `título repetido en ${url}: ${title}`).toBe(false);
      expect(descripciones.has(description ?? ''), `descripción repetida en ${url}`).toBe(false);
      titulos.add(title);
      descripciones.add(description ?? '');
    }
    expect(titulos.size).toBe(urls.length);
    expect(descripciones.size).toBe(urls.length);
  });
});
