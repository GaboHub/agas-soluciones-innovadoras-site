import { expect, test } from '@playwright/test';
import { muestras } from '../_muestras';

test.describe('[interfaz] Largo de línea', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(Boolean(isMobile), 'el ancho se fija con el viewport del proyecto de escritorio');
  });

  test('Guía en escritorio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/guias/${muestras.guia.slug}/`);
    const caracteresPorLinea = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.contenido-md p, .contenido-md li')]
        .filter((elemento) => (elemento.textContent ?? '').trim().length > 0)
        .map((elemento) => {
          const sonda = document.createElement('span');
          sonda.style.cssText = 'position:absolute;visibility:hidden;display:inline-block;width:1ch';
          elemento.appendChild(sonda);
          const ch = sonda.getBoundingClientRect().width;
          sonda.remove();
          return elemento.getBoundingClientRect().width / ch;
        }),
    );
    expect(caracteresPorLinea.length).toBeGreaterThan(0);
    expect(Math.max(...caracteresPorLinea)).toBeLessThanOrEqual(75);
  });
});
