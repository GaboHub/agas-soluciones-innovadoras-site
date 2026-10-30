import { expect, test } from '@playwright/test';
import { paginasDeMuestra } from '../_muestras';
import { alFinalDeLaPagina, razonDelAnilloDeLaBurbuja, razonDelIndicador } from './_foco';
import { recorrerConTeclado } from './_recorrido';

test.describe('[interfaz] Foco visible y no tapado', () => {
  test.setTimeout(180000);

  test('Retroceso con Shift+Tab', async ({ page }) => {
    for (const ruta of paginasDeMuestra) {
      const pasos = await recorrerConTeclado(page, ruta, 'Shift+Tab');
      expect(pasos.length, ruta).toBeGreaterThan(5);
      expect(pasos.filter((paso) => paso.tapadoPorElHeader).map((paso) => `${ruta}: ${paso.etiqueta}`)).toEqual([]);
    }
  });

  test('Indicador propio', async ({ page }) => {
    for (const ruta of paginasDeMuestra) {
      const pasos = await recorrerConTeclado(page, ruta, 'Tab');
      expect(pasos.length, ruta).toBeGreaterThan(5);
      expect(
        pasos
          .filter((paso) => ['none', 'auto'].includes(paso.outlineStyle) || paso.outlineWidth < 2)
          .map((paso) => `${ruta}: ${paso.etiqueta} (${paso.outlineStyle} ${paso.outlineWidth}px)`),
      ).toEqual([]);
    }
  });

  test('Indicador sobre superficie oscura', async ({ page }) => {
    await page.goto('/');
    const superficies = {
      'CTA principal del hero': 'main > section:first-of-type a[href="/productos/"]',
      'CTA secundario del hero': 'main > section:first-of-type a[target="_blank"]',
      'CTA del panel de cierre': 'main > section:last-of-type a[target="_blank"]',
      'enlace del footer': 'footer a[href="/guias/"]',
    };
    for (const [nombre, selector] of Object.entries(superficies)) {
      await page.locator(selector).first().scrollIntoViewIfNeeded();
      expect(await razonDelIndicador(page, selector), nombre).toBeGreaterThanOrEqual(3);
    }
  });

  test('Indicador de la burbuja', async ({ page }) => {
    await page.goto('/contacto/');
    expect(await razonDelAnilloDeLaBurbuja(page, false), 'superficie clara').toBeGreaterThanOrEqual(3);
    await alFinalDeLaPagina(page);
    expect(await razonDelAnilloDeLaBurbuja(page, true), 'footer').toBeGreaterThanOrEqual(3);
  });

  test('El documento reserva scroll-padding-top de al menos la altura del header', async ({ page }) => {
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      const medidas = await page.evaluate(() => ({
        reserva: parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
        header: document.querySelector('header')!.getBoundingClientRect().height,
      }));
      expect(medidas.reserva, ruta).toBeGreaterThanOrEqual(medidas.header);
    }
  });
});
