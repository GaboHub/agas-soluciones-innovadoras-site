import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { leerMetadatos, rutaDe, urlsDelSitemap } from '../_sitemap';

test.describe('[seo-geo] Metadatos por página', () => {
  test('Páginas del sitemap', async ({ page, request }) => {
    test.setTimeout(120000);
    const urls = await urlsDelSitemap(request);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      await page.goto(rutaDe(url));
      const metadatos = await leerMetadatos(page);
      expect(metadatos.lang, url).toBe('es-CL');
      expect(metadatos.title.length, url).toBeGreaterThan(0);
      expect(metadatos.description?.length ?? 0, url).toBeGreaterThan(0);
      expect(metadatos.description?.length ?? 0, url).toBeLessThanOrEqual(160);
      expect(metadatos.canonical, url).toBeTruthy();
      expect(metadatos.og.type, url).toBeTruthy();
      expect(metadatos.og.siteName, url).toBeTruthy();
      expect(metadatos.og.title, url).toBeTruthy();
      expect(metadatos.og.description, url).toBeTruthy();
      expect(metadatos.og.url, url).toBeTruthy();
      expect(metadatos.og.image, url).toMatch(/^https:\/\/agassoluciones\.cl\/.+\.(jpg|jpeg|png)$/);
      const imagen = await sharp(await (await request.get(rutaDe(metadatos.og.image!))).body()).metadata();
      expect(imagen.width, url).toBeLessThanOrEqual(630);
      expect(metadatos.og.imageWidth, url).toBe(String(imagen.width));
      expect(metadatos.og.imageHeight, url).toBe(String(imagen.height));
      expect(metadatos.og.locale, url).toBe('es_CL');
      expect(metadatos.twitterCard, url).toBe('summary_large_image');
      expect(metadatos.favicon, url).toBe('/favicon.svg');
      expect(metadatos.appleTouchIcon, url).toBe('/apple-touch-icon.png');
    }
  });

  test('Página 404', async ({ page }) => {
    const respuesta = await page.goto('/ruta-que-no-existe/');
    expect(respuesta?.status()).toBe(404);
    const { robots, canonical } = await leerMetadatos(page);
    expect(robots).toContain('noindex');
    expect(canonical).toBeNull();
  });
});
