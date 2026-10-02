import { expect, test } from '@playwright/test';
import { getCampanasPublicables, getCuponesPublicables, promociones } from '../../../src/lib/promociones';
import { muestras } from '../_muestras';

const cupones = getCuponesPublicables();
const campanas = getCampanasPublicables();
const hayPublicables = cupones.length + campanas.length > 0;
const etiqueta = (estado: string) => (estado === 'proxima' ? 'Próximamente' : 'Vigente');
const fecha = (iso: string) => iso.split('-').reverse().join('-');

const fichas = [muestras.fichaSimple, muestras.fichaConGrupos];

test.describe('[promociones] Bloque de promociones en la ficha', () => {
  for (const ficha of fichas) {
    test(`Sin publicables: el bloque existe solo si hay publicables (${ficha.slug})`, async ({ page }) => {
      await page.goto(`/productos/${ficha.slug}/`);
      await expect(page.locator('#promociones-resumen')).toHaveCount(hayPublicables ? 1 : 0);
    });

    test(`Sin precios (${ficha.slug})`, async ({ page }) => {
      await page.goto(`/productos/${ficha.slug}/`);
      const bloque = page.locator('#promociones-resumen');
      if (!hayPublicables) {
        await expect(bloque).toHaveCount(0);
        return;
      }
      const texto = (await bloque.textContent()) ?? '';
      expect(texto).not.toMatch(/\$\d{1,3}(\.\d{3})*/);
    });

    test(`el bloque lista las promociones publicables con su estado (${ficha.slug})`, async ({ page }) => {
      if (!hayPublicables) {
        test.skip(true, 'no hay promociones publicables a la fecha de build; lo cubre "Sin publicables"');
        return;
      }
      await page.goto(`/productos/${ficha.slug}/`);
      const bloque = page.locator('#promociones-resumen');
      await expect(bloque.getByText(promociones.aclaracion)).toBeVisible();
      for (const cupon of cupones) {
        const item = bloque.locator('[data-promo]', { hasText: cupon.nombre });
        await expect(item).toContainText(`${cupon.nombre} — ${cupon.porcentaje}%`);
        await expect(item.getByText(etiqueta(cupon.estado), { exact: true })).toBeVisible();
      }
      for (const campana of campanas) {
        const item = bloque.locator('[data-promo]', { hasText: campana.nombre });
        await expect(item).toContainText(`${fecha(campana.desde)} – ${fecha(campana.hasta)}`);
        await expect(item.getByText(etiqueta(campana.estado), { exact: true })).toBeVisible();
      }
      await expect(bloque.locator('a[href="/promociones/"]')).toBeVisible();
    });
  }
});
