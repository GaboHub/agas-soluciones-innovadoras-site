import { expect, test } from '@playwright/test';
import { getCampanasPublicables, getCuponesPublicables, promociones } from '../../../src/lib/promociones';
import { muestras } from '../_muestras';

const publicables = [...getCuponesPublicables(), ...getCampanasPublicables()];
const expiradas = [...promociones.cupones, ...promociones.campanas].filter(
  (promo) => !publicables.some((publicable) => publicable.id === promo.id),
);
const fechas = [...promociones.cupones, ...promociones.campanas].flatMap((promo) => [promo.desde, promo.hasta]);

const scriptsDelDocumento = async (page: import('@playwright/test').Page) => {
  const descriptores = await page.locator('script:not([type="application/ld+json"])').evaluateAll((nodos) =>
    nodos.map((nodo) => ({ texto: nodo.textContent ?? '', src: nodo.getAttribute('src') })),
  );
  const cuerpos: string[] = [];
  for (const { texto, src } of descriptores) {
    cuerpos.push(texto);
    if (src) cuerpos.push(await (await page.request.get(new URL(src, page.url()).href)).text());
  }
  return cuerpos;
};

test.describe('[promociones] Vigencia evaluada al construir', () => {
  test('Sin script de vigencia', async ({ page }) => {
    await page.goto('/promociones/');
    const cuerpos = await scriptsDelDocumento(page);
    expect(cuerpos.length).toBeGreaterThan(0);
    for (const cuerpo of cuerpos) {
      for (const fecha of fechas) expect(cuerpo).not.toContain(fecha);
      expect(cuerpo).not.toContain('AGAS_FECHA_BUILD');
      expect(cuerpo).not.toContain('promociones.json');
    }
  });

  test('las promociones expiradas a la fecha de build no están en ninguna página de muestra', async ({ page }) => {
    for (const ruta of ['/promociones/', `/productos/${muestras.fichaSimple.slug}/`]) {
      await page.goto(ruta);
      const cuerpo = (await page.locator('main').textContent()) ?? '';
      for (const promo of expiradas) expect(cuerpo).not.toContain(promo.nombre);
    }
  });

  test('Un reloj de navegador adelantado no cambia lo que muestran las páginas', async ({ browser, page, request }) => {
    test.skip(publicables.length === 0, 'sin promociones publicables a la fecha de build no hay tarjetas que comparar');
    const adelantado = await browser.newPage();
    await adelantado.clock.install({ time: new Date('2999-01-01T12:00:00Z') });
    const ficha = `/productos/${muestras.fichaSimple.slug}/`;
    try {
      for (const ruta of ['/promociones/', ficha]) {
        const construido = await (await request.get(ruta)).text();
        const baseURL = test.info().project.use.baseURL;
        await page.goto(ruta);
        await adelantado.goto(`${baseURL}${ruta}`);
        const lecturas = (pagina: typeof page) =>
          pagina.locator('[data-promo]').evaluateAll((nodos) => nodos.map((nodo) => nodo.outerHTML));
        const normal = await lecturas(page);
        expect(normal.length).toBeGreaterThan(0);
        expect(await lecturas(adelantado)).toEqual(normal);
        expect(normal).toHaveLength(construido.match(/data-promo/g)?.length ?? 0);
      }
    } finally {
      await adelantado.close();
    }
  });
});
