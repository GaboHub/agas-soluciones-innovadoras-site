import { expect, test } from '@playwright/test';
import { bloquesJsonLd } from '../_jsonld';
import { muestras } from '../_muestras';

const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;

test.describe('[seo-geo] Article de cada guía', () => {
  test('Fechas de la guía', async ({ page }) => {
    expect(muestras.guias.length).toBeGreaterThan(0);
    for (const guia of muestras.guias) {
      expect(guia.publicado, guia.slug).toMatch(formatoFecha);
      expect(guia.actualizado, guia.slug).toMatch(formatoFecha);
      expect(guia.actualizado >= guia.publicado, guia.slug).toBe(true);
      await page.goto(`/guias/${guia.slug}/`);
      const articulo = (await bloquesJsonLd(page)).find((bloque) => bloque['@type'] === 'Article');
      expect(articulo, guia.slug).toBeDefined();
      expect(articulo!.datePublished, guia.slug).toBe(guia.publicado);
      expect(articulo!.dateModified, guia.slug).toBe(guia.actualizado);
      expect(articulo!.headline, guia.slug).toBe(guia.titulo);
      expect(articulo!.description, guia.slug).toBe(guia.descripcion);
      expect(articulo!.inLanguage, guia.slug).toBe('es-CL');
      expect(articulo!.mainEntityOfPage, guia.slug).toBe(`https://agassoluciones.cl/guias/${guia.slug}/`);
      expect(articulo!.publisher['@type'], guia.slug).toBe('Organization');
      expect(articulo!.publisher['@id'], guia.slug).toBe('https://agassoluciones.cl/#organizacion');
    }
  });

  test('Fecha visible', async ({ page }) => {
    for (const guia of muestras.guias) {
      await page.goto(`/guias/${guia.slug}/`);
      const articulo = (await bloquesJsonLd(page)).find((bloque) => bloque['@type'] === 'Article');
      const fecha = page.locator('xpath=//main//h1/following::time[1]');
      await expect(fecha, guia.slug).toBeVisible();
      await expect(fecha, guia.slug).toHaveAttribute('datetime', articulo!.dateModified);
      await expect(fecha, guia.slug).toHaveText(articulo!.dateModified.split('-').reverse().join('-'));
      const [cajaTitulo, cajaFecha, cajaProsa] = await Promise.all(
        ['main h1', 'xpath=//main//h1/following::time[1]', 'main .contenido-md'].map((selector) =>
          page.locator(selector).first().boundingBox(),
        ),
      );
      expect(cajaFecha!.y, guia.slug).toBeGreaterThan(cajaTitulo!.y);
      expect(cajaFecha!.y, guia.slug).toBeLessThan(cajaProsa!.y);
    }
  });
});
