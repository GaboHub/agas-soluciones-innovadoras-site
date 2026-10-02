import { expect, test } from '@playwright/test';
import { leerMetadatos, rutaDe, urlsDelSitemap } from '../_sitemap';

test.describe('[seo-geo] Sitio estático canónico', () => {
  test('Canonical de cada página', async ({ page, request }) => {
    const urls = await urlsDelSitemap(request);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      await page.goto(rutaDe(url));
      const { canonical } = await leerMetadatos(page);
      expect(canonical, url).toMatch(/^https:\/\/agassoluciones\.cl\//);
      expect(canonical, url).toMatch(/\/$/);
      expect(canonical, url).toBe(url);
    }
  });
});
