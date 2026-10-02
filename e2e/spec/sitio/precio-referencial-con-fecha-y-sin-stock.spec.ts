import { expect, test } from '@playwright/test';
import { muestras } from '../_muestras';

const conMiles = (valor: number) => `$${String(valor).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const aDiaMesAnio = (iso: string) => iso.split('-').reverse().join('-');

test.describe('[sitio] Precio referencial con fecha y sin stock', () => {
  test('Formato del precio', async ({ page }) => {
    expect(muestras.fichas.length).toBeGreaterThan(0);
    for (const ficha of muestras.fichas) {
      await page.goto(`/productos/${ficha.slug}/`);
      const principal = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
      expect(principal, ficha.slug).toContain(conMiles(ficha.precioReferencial));
      expect(principal, ficha.slug).toContain(
        `Precio referencial al ${aDiaMesAnio(ficha.fechaPrecio)} — ver precio vigente en Mercado Libre`,
      );
    }
  });

  test('Las tarjetas del catálogo muestran el precio con miles separados por punto', async ({ page }) => {
    await page.goto('/productos/');
    for (const ficha of muestras.fichas) {
      const tarjeta = page.locator(`main a[href="/productos/${ficha.slug}/"]`);
      await expect(tarjeta, ficha.slug).toContainText(conMiles(ficha.precioReferencial));
    }
  });

  test('Sin stock', async ({ page }) => {
    for (const ficha of muestras.fichas) {
      await page.goto(`/productos/${ficha.slug}/`);
      const principal = await page.locator('main').innerText();
      expect(principal, ficha.slug).not.toMatch(/stock/i);
    }
  });
});
