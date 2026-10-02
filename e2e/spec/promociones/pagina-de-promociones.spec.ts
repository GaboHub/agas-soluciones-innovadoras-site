import { expect, test } from '@playwright/test';
import { getCampanasPublicables, getCuponesPublicables, promociones } from '../../../src/lib/promociones';
import site from '../../../src/data/site.json' with { type: 'json' };

const cupones = getCuponesPublicables();
const campanas = getCampanasPublicables();
const etiqueta = (estado: string) => (estado === 'proxima' ? 'Próximamente' : 'Vigente');
const fecha = (iso: string) => iso.split('-').reverse().join('-');

test.describe('[promociones] Página de promociones', () => {
  for (const cupon of cupones) {
    test(`Cupón ${cupon.estado} en el build real: ${cupon.id}`, async ({ page }) => {
      await page.goto('/promociones/');
      const tarjeta = page.locator('#cupones [data-promo]', { hasText: cupon.nombre });
      await expect(tarjeta).toBeVisible();
      await expect(tarjeta.getByText(etiqueta(cupon.estado), { exact: true })).toBeVisible();
      await expect(tarjeta.getByText(`${cupon.porcentaje}%`, { exact: true })).toBeVisible();
      await expect(tarjeta.getByText(`${fecha(cupon.desde)} – ${fecha(cupon.hasta)}`)).toBeVisible();
      await expect(tarjeta.locator('a')).toHaveAttribute('href', site.mercadolibre.paginaOficial);
    });
  }

  for (const campana of campanas) {
    test(`Campaña ${campana.estado} en el build real: ${campana.id}`, async ({ page }) => {
      await page.goto('/promociones/');
      const tarjeta = page.locator('#campanas [data-promo]', { hasText: campana.nombre });
      await expect(tarjeta).toBeVisible();
      await expect(tarjeta.getByText(etiqueta(campana.estado), { exact: true })).toBeVisible();
      await expect(tarjeta.getByText(campana.descripcion)).toBeVisible();
      await expect(tarjeta.locator('a')).toHaveAttribute('href', site.mercadolibre.tienda);
    });
  }

  test('las tarjetas son exactamente las publicables, vigentes primero', async ({ page }) => {
    await page.goto('/promociones/');
    await expect(page.locator('[data-promo]')).toHaveCount(cupones.length + campanas.length);
    await expect(page.locator('#cupones')).toHaveCount(cupones.length > 0 ? 1 : 0);
    await expect(page.locator('#campanas')).toHaveCount(campanas.length > 0 ? 1 : 0);
    await expect(page.locator('#promo-fallback')).toHaveCount(cupones.length + campanas.length === 0 ? 1 : 0);
    const nombres = await page.locator('#campanas [data-promo] h3').allTextContents();
    expect(nombres).toEqual(campanas.map((campana) => campana.nombre));
  });

  test('muestra la aclaración y cierra con las preguntas frecuentes de promociones', async ({ page }) => {
    await page.goto('/promociones/');
    await expect(page.getByText(promociones.aclaracion)).toBeVisible();
    const preguntas = page.locator('main details summary');
    await expect(preguntas).toHaveCount(promociones.faqs.length);
  });
});
