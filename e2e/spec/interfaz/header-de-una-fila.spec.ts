import { expect, test, type Page } from '@playwright/test';
import { muestras } from '../_muestras';

const rutas = ['/', `/productos/${muestras.fichaConGrupos.slug}/`, '/contacto/'];

const medirHeader = (page: Page) =>
  page.evaluate(() => {
    const header = document.querySelector('header')!;
    const caja = header.getBoundingClientRect();
    const excedentes = [...header.querySelectorAll<HTMLElement>('*')]
      .map((elemento) => ({ elemento, caja: elemento.getBoundingClientRect() }))
      .filter(({ caja: c }) => c.width > 0 && c.height > 0 && c.right > window.innerWidth + 0.5)
      .map(({ elemento }) => `${elemento.tagName.toLowerCase()} ${(elemento.textContent ?? '').trim().slice(0, 30)}`);
    return { alto: caja.height, excedentes };
  });

test.describe('[interfaz] Header de una fila', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(Boolean(isMobile), 'los anchos se fijan con el viewport del proyecto de escritorio');
  });

  test('Anchos intermedios', async ({ page }) => {
    for (const ancho of [768, 820, 844, 900, 1024, 1100]) {
      await page.setViewportSize({ width: ancho, height: 800 });
      for (const ruta of rutas) {
        await page.goto(ruta);
        const { alto, excedentes } = await medirHeader(page);
        expect(alto, `${ruta} a ${ancho}px`).toBeLessThanOrEqual(72);
        expect(excedentes, `${ruta} a ${ancho}px`).toEqual([]);
      }
    }
  });

  test('Móvil apaisado', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    for (const ruta of rutas) {
      await page.goto(ruta);
      const { alto, excedentes } = await medirHeader(page);
      expect(alto, ruta).toBeLessThanOrEqual(78);
      expect(excedentes, ruta).toEqual([]);
    }
  });

  test('En horizontal no supera el 20 % del alto de la ventana', async ({ page }) => {
    for (const [ancho, alto] of [[667, 375], [740, 360], [844, 390], [915, 412], [932, 430]]) {
      await page.setViewportSize({ width: ancho, height: alto });
      await page.goto('/');
      expect((await medirHeader(page)).alto, `${ancho}x${alto}`).toBeLessThanOrEqual(alto * 0.2);
    }
  });
});
