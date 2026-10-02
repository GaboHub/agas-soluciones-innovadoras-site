import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import site from '../../../src/data/site.json' with { type: 'json' };
import { muestras } from '../_muestras';

const dist = path.resolve(import.meta.dirname, '../../../dist');
const fecha = (valor: string) => valor.slice(0, 10);
const maxima = (fechas: string[]) => [...fechas].sort().at(-1);

const entradas = async (request: import('@playwright/test').APIRequestContext) => {
  const xml = await (await request.get('/sitemap-0.xml')).text();
  return [...xml.matchAll(/<url>(.*?)<\/url>/g)].map(([, cuerpo]) => ({
    ruta: new URL(cuerpo.match(/<loc>([^<]+)<\/loc>/)![1]).pathname,
    lastmod: cuerpo.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
  }));
};

const paginasConstruidas = () =>
  (readdirSync(dist, { recursive: true }) as string[])
    .filter((archivo) => archivo.endsWith('.html'))
    .map((archivo) => ({
      ruta: `/${archivo.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '/')}`,
      noindex: /<meta name="robots" content="noindex"/.test(readFileSync(path.join(dist, archivo), 'utf-8')),
    }));

const fichaPorSlug = new Map(muestras.fichas.map((ficha) => [ficha.slug as string, ficha]));
const fechasDe = (slugs: string[]) => slugs.map((slug) => fichaPorSlug.get(slug)!.fechaPrecio as string);

test.describe('[seo-geo] Sitemap con fechas reales', () => {
  test('Ficha', async ({ request }) => {
    const lista = await entradas(request);
    for (const ficha of muestras.fichas) {
      const entrada = lista.find((candidata) => candidata.ruta === `/productos/${ficha.slug}/`);
      expect(entrada?.lastmod, ficha.slug).toBeDefined();
      expect(fecha(entrada!.lastmod!), ficha.slug).toBe(ficha.fechaPrecio);
    }
  });

  test('Listados y guías según la tabla', async ({ request }) => {
    const lista = await entradas(request);
    const lastmodDe = (ruta: string) => lista.find((entrada) => entrada.ruta === ruta)?.lastmod;
    const todas = muestras.fichas.map((ficha) => ficha.fechaPrecio as string);
    expect(fecha(lastmodDe('/')!)).toBe(maxima(todas));
    expect(fecha(lastmodDe('/productos/')!)).toBe(maxima(todas));
    for (const categoria of site.categorias) {
      expect(fecha(lastmodDe(`/categorias/${categoria.slug}/`)!), categoria.slug).toBe(maxima(fechasDe(categoria.productos)));
    }
    for (const guia of muestras.guias) {
      expect(fecha(lastmodDe(`/guias/${guia.slug}/`)!), guia.slug).toBe(guia.actualizado);
    }
    expect(fecha(lastmodDe('/guias/')!)).toBe(maxima(muestras.guias.map((guia) => guia.actualizado as string)));
  });

  test('Página sin fuente fechada', async ({ request }) => {
    const lista = await entradas(request);
    for (const ruta of ['/contacto/', '/promociones/', '/preguntas-frecuentes/', '/terminos-y-condiciones/']) {
      const entrada = lista.find((candidata) => candidata.ruta === ruta);
      expect(entrada, ruta).toBeDefined();
      expect(entrada!.lastmod, ruta).toBeUndefined();
    }
  });

  test('Sin 404', async ({ request }) => {
    const lista = await entradas(request);
    const rutas = lista.map((entrada) => entrada.ruta);
    expect(rutas.length).toBeGreaterThan(0);
    expect(rutas.filter((ruta) => ruta.includes('404'))).toEqual([]);
    for (const ruta of rutas) {
      expect((await request.get(ruta)).status(), ruta).toBe(200);
    }
    const indice = await (await request.get('/sitemap-index.xml')).text();
    expect(indice).toContain('https://agassoluciones.cl/sitemap-0.xml');
    const indexables = paginasConstruidas().filter((pagina) => !pagina.noindex).map((pagina) => pagina.ruta);
    expect(rutas.slice().sort()).toEqual(indexables.sort());
    for (const pagina of paginasConstruidas().filter((candidata) => candidata.noindex)) {
      expect(rutas).not.toContain(pagina.ruta);
    }
  });
});
