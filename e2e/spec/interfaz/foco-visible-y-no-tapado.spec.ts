import { expect, test } from '@playwright/test';
import { paginasDeMuestra } from '../_muestras';
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
