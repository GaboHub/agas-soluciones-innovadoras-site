import { expect, test, type Page } from '@playwright/test';
import { muestras } from '../_muestras';

const guiaConProductos = muestras.guias.find((guia) => (guia.productosRelacionados as string[]).length >= 2)!;
const categoria = muestras.fichas[0].categoria as string;

const listados: Record<string, { ruta: string; selector: string }> = {
  catálogo: { ruta: '/productos/', selector: 'main ul > li > a[href^="/productos/"]' },
  categoría: { ruta: `/categorias/${categoria}/`, selector: 'main a[href^="/productos/"]' },
  'favoritas de la home': { ruta: '/', selector: 'main a[href^="/productos/"]:has(img)' },
  'relacionados de la guía': { ruta: `/guias/${guiaConProductos.slug}/`, selector: 'main a[href^="/productos/"]:has(img)' },
};

const cajas = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((enlaces) =>
    enlaces.slice(0, 2).map((enlace) => {
      const caja = enlace.getBoundingClientRect();
      return { izquierda: caja.left, derecha: caja.right, arriba: Math.round(caja.top + scrollY) };
    }),
  );

test.describe('[sitio] Listados en dos columnas en móvil', () => {
  test('Catálogo a 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(listados.catálogo.ruta);
    const [primera, segunda] = await cajas(page, listados.catálogo.selector);
    expect(primera.arriba).toBe(segunda.arriba);
    expect(primera.derecha).toBeLessThanOrEqual(segunda.izquierda);
    expect(segunda.derecha).toBeLessThanOrEqual(390);
  });

  for (const ancho of [320, 390]) {
    for (const [nombre, { ruta, selector }] of Object.entries(listados)) {
      test(`${nombre} muestra dos tarjetas por fila a ${ancho} px`, async ({ page }) => {
        await page.setViewportSize({ width: ancho, height: 844 });
        await page.goto(ruta);
        const [primera, segunda] = await cajas(page, selector);
        expect(primera.arriba, ruta).toBe(segunda.arriba);
        expect(primera.derecha, ruta).toBeLessThanOrEqual(segunda.izquierda);
        expect(segunda.derecha, ruta).toBeLessThanOrEqual(ancho);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), ruta).toBeLessThanOrEqual(ancho);
      });
    }
  }
});
