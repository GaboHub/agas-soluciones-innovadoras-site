import { expect, test } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { paginasDeMuestra } from '../_muestras';

const anchos = [320, 390, 768, 820, 1024, 1280];

test.describe('[interfaz] Reflow sin scroll horizontal', () => {
  test.setTimeout(180000);

  test.beforeEach(({ isMobile }) => {
    test.skip(Boolean(isMobile), 'los anchos se fijan con el viewport del proyecto de escritorio');
  });

  test('Recorrido de anchos', async ({ page }) => {
    for (const ancho of anchos) {
      await page.setViewportSize({ width: ancho, height: 800 });
      for (const ruta of paginasDeMuestra) {
        await page.goto(ruta);
        await esperarHidratacion(page);
        const fuera = await page.evaluate(() => {
          const ancho = window.innerWidth;
          const recortes = (elemento: Element) => {
            const cajas: DOMRect[] = [];
            for (let padre = elemento.parentElement; padre && padre !== document.body && padre !== document.documentElement; padre = padre.parentElement) {
              if (getComputedStyle(padre).overflowX !== 'visible') cajas.push(padre.getBoundingClientRect());
            }
            return cajas;
          };
          return [...document.body.querySelectorAll('*')]
            .filter((elemento) => {
              const estilo = getComputedStyle(elemento);
              if (estilo.display === 'none' || estilo.visibility === 'hidden') return false;
              const caja = elemento.getBoundingClientRect();
              if (caja.width <= 1 || caja.height <= 1) return false;
              let izquierda = caja.left;
              let derecha = caja.right;
              for (const recorte of recortes(elemento)) {
                izquierda = Math.max(izquierda, recorte.left);
                derecha = Math.min(derecha, recorte.right);
              }
              if (derecha <= izquierda) return false;
              return izquierda < -0.5 || derecha > ancho + 0.5;
            })
            .map((elemento) => `${elemento.tagName.toLowerCase()}.${String(elemento.getAttribute('class')).slice(0, 50)}`);
        });
        expect(fuera, `${ruta} a ${ancho}px`).toEqual([]);
      }
    }
  });
});
