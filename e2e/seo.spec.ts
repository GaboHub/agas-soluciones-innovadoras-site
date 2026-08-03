import { test, expect } from '@playwright/test';

const paginas = [
  { path: '/', esProducto: false, tieneFaqJsonLd: false },
  { path: '/productos/', esProducto: false, tieneFaqJsonLd: false },
  { path: '/categorias/nintendo-switch/', esProducto: false, tieneFaqJsonLd: false },
  { path: '/categorias/playstation-5/', esProducto: false, tieneFaqJsonLd: false },
  { path: '/productos/lamina-vidrio-nintendo-switch/', esProducto: true, tieneFaqJsonLd: true },
  { path: '/preguntas-frecuentes/', esProducto: false, tieneFaqJsonLd: true },
  { path: '/contacto/', esProducto: false, tieneFaqJsonLd: false },
  { path: '/promociones/', esProducto: false, tieneFaqJsonLd: true },
];

async function extraerJsonLd(page: import('@playwright/test').Page) {
  const bloques = await page.locator('script[type="application/ld+json"]').allTextContents();
  return bloques.map((bloque) => JSON.parse(bloque));
}

test.describe('SEO', () => {
  for (const pagina of paginas) {
    test(`metadatos de ${pagina.path}`, async ({ page }) => {
      await page.goto(pagina.path);

      await expect(page.locator('html')).toHaveAttribute('lang', 'es-CL');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);

      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description).toBeTruthy();
      expect(description!.length).toBeLessThanOrEqual(160);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toMatch(/^https:\/\/agassoluciones\.cl\//);
      expect(canonical?.endsWith('/')).toBe(true);

      const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(ogImage).toMatch(/^https:\/\/agassoluciones\.cl\//);

      const bloquesJsonLd = await extraerJsonLd(page);
      expect(bloquesJsonLd.length).toBeGreaterThan(0);
      const tipos = bloquesJsonLd.map((entrada) => entrada['@type']);
      expect(tipos).toContain('Organization');

      const organization = bloquesJsonLd.find((entrada) => entrada['@type'] === 'Organization');
      expect(organization.legalName).toBe('Agas Soluciones Innovadoras SpA');
      expect(organization.sameAs.length).toBe(2);

      if (pagina.esProducto) {
        const product = bloquesJsonLd.find((entrada) => entrada['@type'] === 'Product');
        expect(product).toBeDefined();
        expect(product.offers['@type']).toBe('Offer');
        expect(product.offers.url).toMatch(/^https:\/\/articulo\.mercadolibre\.cl\//);
        expect(product.offers.priceCurrency).toBe('CLP');
        expect(product.offers.price).toBeGreaterThan(0);
        expect(JSON.stringify(product)).not.toContain('availability');
      }

      const faqPage = bloquesJsonLd.find((entrada) => entrada['@type'] === 'FAQPage');
      if (pagina.tieneFaqJsonLd) {
        expect(faqPage).toBeDefined();
        expect(Array.isArray(faqPage.mainEntity)).toBe(true);
        expect(faqPage.mainEntity.length).toBeGreaterThan(0);

        for (const pregunta of faqPage.mainEntity) {
          await expect(page.getByText(pregunta.name, { exact: true })).toBeVisible();
        }
      } else {
        expect(faqPage).toBeUndefined();
      }

      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toHaveCount(1);
    });
  }

  test('la home declara WebSite y Organization', async ({ page }) => {
    await page.goto('/');
    const bloquesJsonLd = await extraerJsonLd(page);
    const tipos = bloquesJsonLd.map((entrada) => entrada['@type']);
    expect(tipos).toContain('WebSite');
    expect(tipos).toContain('Organization');
    expect(tipos).not.toContain('LocalBusiness');
    expect(tipos).not.toContain('Service');
  });

  test('los títulos y descripciones son únicos entre las páginas muestreadas', async ({ page }) => {
    const titulos = new Set<string>();
    const descripciones = new Set<string>();
    for (const pagina of paginas) {
      await page.goto(pagina.path);
      titulos.add(await page.title());
      descripciones.add((await page.locator('meta[name="description"]').getAttribute('content')) ?? '');
    }
    expect(titulos.size).toBe(paginas.length);
    expect(descripciones.size).toBe(paginas.length);
  });
});
