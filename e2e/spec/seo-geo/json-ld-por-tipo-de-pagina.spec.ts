import { expect, test } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };
import { getCampanasPublicables } from '../../../src/lib/promociones';
import { bloquesJsonLd } from '../_jsonld';
import { muestras } from '../_muestras';
import { rutaDe, urlsDelSitemap } from '../_sitemap';

const fichaPorSlug = new Map(muestras.fichas.map((ficha) => [ficha.slug as string, ficha]));

const tiposEsperados = (ruta: string): string[] => {
  const organizacion = 'Organization';
  const slug = ruta.split('/')[2];
  if (ruta === '/') return [organizacion, 'WebSite'];
  if (ruta === '/productos/' || ruta.startsWith('/categorias/')) return [organizacion, 'ItemList'];
  if (ruta.startsWith('/productos/')) {
    const ficha = fichaPorSlug.get(slug)!;
    const faqs = Array.isArray(ficha.faqs) && ficha.faqs.length > 0 ? ['FAQPage'] : [];
    return [organizacion, ficha.tipo === 'simple' ? 'Product' : 'ProductGroup', 'BreadcrumbList', ...faqs];
  }
  if (ruta === '/guias/') return [organizacion];
  if (ruta.startsWith('/guias/')) return [organizacion, 'Article'];
  if (ruta === '/preguntas-frecuentes/') return [organizacion, 'FAQPage'];
  if (ruta === '/promociones/') {
    return [organizacion, 'FAQPage', ...getCampanasPublicables().map(() => 'SaleEvent')];
  }
  return [organizacion];
};

const valoresNulos = (valor: unknown, ruta = '$'): string[] => {
  if (valor === null || valor === undefined) return [ruta];
  if (Array.isArray(valor)) return valor.flatMap((item, indice) => valoresNulos(item, `${ruta}[${indice}]`));
  if (typeof valor === 'object') {
    return Object.entries(valor).flatMap(([clave, item]) => valoresNulos(item, `${ruta}.${clave}`));
  }
  return [];
};

test.describe('[seo-geo] JSON-LD por tipo de página', () => {
  test('Home', async ({ page }) => {
    await page.goto('/');
    const bloques = await bloquesJsonLd(page);
    const tipos = bloques.map((bloque) => bloque['@type']);
    expect(tipos).toContain('Organization');
    expect(tipos).toContain('WebSite');
    expect(JSON.stringify(bloques)).not.toContain('aggregateRating');
    expect(tipos).not.toContain('Review');
    expect(JSON.stringify(bloques)).not.toContain('"Review"');
  });

  test('Tipos por página', async ({ page, request }) => {
    const rutas = [...(await urlsDelSitemap(request)).map(rutaDe), '/ruta-que-no-existe/'];
    expect(rutas.length).toBeGreaterThan(1);
    for (const ruta of rutas) {
      await page.goto(ruta);
      const bloques = await bloquesJsonLd(page);
      const tipos = bloques.map((bloque) => bloque['@type'] as string);
      expect(tipos.slice().sort(), ruta).toEqual(tiposEsperados(ruta).sort());
      expect(tipos, ruta).not.toContain('LocalBusiness');
      expect(tipos, ruta).not.toContain('Service');
      expect(valoresNulos(bloques), ruta).toEqual([]);
    }
  });

  test('Organization con id, datos de site.json y logo absoluto', async ({ page }) => {
    for (const ruta of ['/', '/contacto/']) {
      await page.goto(ruta);
      const organizacion = (await bloquesJsonLd(page)).find((bloque) => bloque['@type'] === 'Organization')!;
      expect(organizacion['@id'], ruta).toBe('https://agassoluciones.cl/#organizacion');
      expect(organizacion.name, ruta).toBe(site.nombre);
      expect(organizacion.legalName, ruta).toBe(site.razonSocial);
      expect(organizacion.url, ruta).toBe(`https://${site.dominio}`);
      expect(organizacion.logo, ruta).toMatch(/^https:\/\/agassoluciones\.cl\/.+/);
      expect(organizacion.address, ruta).toEqual({
        '@type': 'PostalAddress',
        addressLocality: site.direccion.localidad,
        addressRegion: site.direccion.region,
        addressCountry: site.direccion.pais,
      });
      expect(organizacion.sameAs, ruta).toEqual([site.mercadolibre.tienda, site.mercadolibre.paginaOficial]);
    }
  });
});
