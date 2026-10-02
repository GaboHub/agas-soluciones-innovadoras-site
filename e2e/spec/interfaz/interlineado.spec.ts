import { expect, test } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { paginasDeMuestra } from '../_muestras';

test.describe('[interfaz] Interlineado', () => {
  test.setTimeout(180000);

  test('Texto chico', async ({ page }) => {
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      await esperarHidratacion(page);
      const medidos = await page.evaluate(() =>
        [...document.querySelectorAll('p, li, blockquote')]
          .filter((elemento) => (elemento.textContent ?? '').trim().length > 60)
          .map((elemento) => {
            const estilo = getComputedStyle(elemento);
            return {
              texto: (elemento.textContent ?? '').trim().slice(0, 40),
              razon: parseFloat(estilo.lineHeight) / parseFloat(estilo.fontSize),
            };
          }),
      );
      expect(medidos.length, ruta).toBeGreaterThan(0);
      expect(
        medidos.filter(({ razon }) => !(razon >= 1.5 - 0.001)).map(({ texto, razon }) => `${ruta}: ${texto} (${razon})`),
      ).toEqual([]);
    }
  });
});
