import { expect, test } from '@playwright/test';
import { getCuponesPublicables } from '../../../src/lib/promociones';
import { muestras } from '../_muestras';

const clp = (valor: number) => `$${valor.toLocaleString('es-CL')}`;
const porcentajesDeCupones = getCuponesPublicables().map((cupon) => `${cupon.porcentaje}%`);

test.describe('[promociones] Sin descuentos derivados', () => {
  for (const ficha of [muestras.fichaSimple, muestras.fichaConGrupos]) {
    test(`Ficha con campaña vigente: el precio es el referencial (${ficha.slug})`, async ({ page }) => {
      await page.goto(`/productos/${ficha.slug}/`);
      const texto = (await page.locator('main').innerText()) ?? '';
      const precios = texto.match(/\$\d{1,3}(?:\.\d{3})*/g) ?? [];
      const permitidos = [
        clp(ficha.datos.precioReferencial),
        ...((ficha.datos.miembros ?? []) as { precio: number }[]).map((miembro) => clp(miembro.precio)),
      ];
      expect(precios).toContain(clp(ficha.datos.precioReferencial));
      expect(precios.filter((precio) => !permitidos.includes(precio))).toEqual([]);
    });

    test(`el bloque de promociones de la ficha no agrega porcentajes ajenos a los cupones (${ficha.slug})`, async ({ page }) => {
      await page.goto(`/productos/${ficha.slug}/`);
      const bloque = page.locator('#promociones-resumen');
      if ((await bloque.count()) === 0) return;
      const texto = (await bloque.textContent()) ?? '';
      const porcentajes = texto.match(/\d+(?:[.,]\d+)?\s?%/g) ?? [];
      expect(porcentajes.filter((porcentaje) => !porcentajesDeCupones.includes(porcentaje))).toEqual([]);
    });
  }
});
