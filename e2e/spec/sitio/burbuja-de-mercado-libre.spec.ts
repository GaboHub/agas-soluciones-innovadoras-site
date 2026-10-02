import { expect, test } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };
import { esperarHidratacion } from '../_hidratacion';
import { muestras, paginasDeMuestra } from '../_muestras';
import { elegir, enlaceDelCta, fichasConOpciones } from '../_selector';

test.describe('[sitio] Burbuja de Mercado Libre', () => {
  test('Fuera de una ficha', async ({ page }) => {
    await page.goto('/');
    const burbuja = page.locator('#burbuja-mercadolibre');
    await expect(burbuja).toHaveAttribute('href', site.mercadolibre.tienda);
    await expect(burbuja).toHaveAttribute('target', '_blank');
    await expect(burbuja).toHaveAttribute('rel', 'noopener');
    await expect(page.getByRole('link', { name: site.ctaHeader, exact: true }).and(burbuja)).toBeVisible();
  });

  test('Ficha con opción cambiada', async ({ page }) => {
    const { ficha, gruposFicha, etiquetaOpcion } = fichasConOpciones.find(
      ({ gruposFicha }) => gruposFicha.length === 1 && gruposFicha[0].opciones.length > 1,
    )!;
    await page.goto(`/productos/${ficha.slug}/`);
    await esperarHidratacion(page);
    const burbuja = page.locator('#burbuja-mercadolibre');
    await expect(burbuja).toHaveAttribute('href', gruposFicha[0].opciones[0].link);
    await expect(page.getByRole('link', { name: site.ctaBurbujaProducto, exact: true }).and(burbuja)).toBeVisible();
    await elegir(page, etiquetaOpcion, 1);
    const cta = await enlaceDelCta(page);
    expect(cta).toBe(gruposFicha[0].opciones[1].link);
    await expect(burbuja).toHaveAttribute('href', cta!);
  });

  test('Móvil', async ({ page }) => {
    const ancho = 390;
    const alto = 844;
    await page.setViewportSize({ width: ancho, height: alto });
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      const burbuja = page.locator('#burbuja-mercadolibre');
      await expect(burbuja, ruta).toBeVisible();
      const caja = (await burbuja.boundingBox())!;
      expect(caja.x, ruta).toBeGreaterThanOrEqual(ancho / 2);
      expect(caja.y, ruta).toBeGreaterThanOrEqual(alto / 2);
      expect(caja.x + caja.width, ruta).toBeLessThanOrEqual(ancho);
      expect(caja.y + caja.height, ruta).toBeLessThanOrEqual(alto);
    }
  });

  test('Toda página muestra la burbuja con enlace seguro, también en escritorio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const ruta of [...paginasDeMuestra, `/productos/${muestras.fichaSimple.slug}/`]) {
      await page.goto(ruta);
      const burbuja = page.locator('#burbuja-mercadolibre');
      await expect(burbuja, ruta).toBeVisible();
      await expect(burbuja, ruta).toHaveAttribute('target', '_blank');
      await expect(burbuja, ruta).toHaveAttribute('rel', 'noopener');
    }
  });
});
