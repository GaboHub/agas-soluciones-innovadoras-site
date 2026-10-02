import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import site from '../../../src/data/site.json' with { type: 'json' };
import { muestras } from '../_muestras';

const rutasFijas = ['/', '/productos/', '/guias/', '/promociones/', '/preguntas-frecuentes/', '/contacto/', '/terminos-y-condiciones/'];

const rutasEsperadas = [
  ...rutasFijas,
  ...muestras.fichas.map((ficha) => `/productos/${ficha.slug}/`),
  ...site.categorias.map((categoria) => `/categorias/${categoria.slug}/`),
  ...muestras.guias.map((guia) => `/guias/${guia.slug}/`),
];

test.describe('[sitio] Rutas generadas desde datos', () => {
  test('Cada ficha tiene su ruta', async ({ request }) => {
    expect(muestras.fichas.length).toBeGreaterThan(0);
    expect(site.categorias.length).toBeGreaterThan(0);
    for (const ruta of rutasEsperadas) {
      const respuesta = await request.get(ruta);
      expect(respuesta.status(), ruta).toBe(200);
    }
  });

  test('Ruta inexistente', async ({ page, request }) => {
    const pagina404 = readFileSync(path.resolve(import.meta.dirname, '../../../dist/404.html'), 'utf-8');
    const tituloDe404 = pagina404.match(/<title>([^<]*)<\/title>/)![1];
    for (const ruta of ['/ruta-que-no-existe/', '/productos/ficha-que-no-existe/', '/categorias/categoria-que-no-existe/']) {
      const respuesta = await page.goto(ruta);
      expect(respuesta?.status(), ruta).toBe(404);
      expect(await page.title(), ruta).toBe(tituloDe404.replace(/&amp;/g, '&'));
      await expect(page.getByRole('heading', { level: 1 }), ruta).toHaveCount(1);
    }
    expect((await request.get('/ruta-que-no-existe/')).status()).toBe(404);
  });
});
