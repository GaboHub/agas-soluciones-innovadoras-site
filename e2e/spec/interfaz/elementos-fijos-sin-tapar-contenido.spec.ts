import { expect, test, type Page } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { paginasDeMuestra } from '../_muestras';
import { SELECTOR_OBJETIVOS } from './_objetivos';

const alFinalDeLaPagina = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let ultimo = -1;
        let estables = 0;
        const paso = () => {
          window.scrollTo(0, document.documentElement.scrollHeight);
          estables = window.scrollY === ultimo ? estables + 1 : 0;
          ultimo = window.scrollY;
          if (estables >= 4) resolve();
          else requestAnimationFrame(paso);
        };
        paso();
      }),
  );

const tapadoPorLaBurbuja = (page: Page) =>
  page.evaluate((selectorObjetivos) => {
    const burbuja = document.getElementById('burbuja-mercadolibre')!;
    const cajaBurbuja = burbuja.getBoundingClientRect();
    const interseca = (caja: DOMRect) =>
      caja.width > 0 &&
      caja.height > 0 &&
      caja.left < cajaBurbuja.right &&
      caja.right > cajaBurbuja.left &&
      caja.top < cajaBurbuja.bottom &&
      caja.bottom > cajaBurbuja.top;
    const tapados: string[] = [];

    const lineas = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let encontrados = 0;
    for (let nodo = lineas.nextNode(); nodo; nodo = lineas.nextNode()) {
      const padre = nodo.parentElement;
      if (!padre || burbuja.contains(padre) || !nodo.textContent?.trim()) continue;
      if (!padre.checkVisibility({ visibilityProperty: true })) continue;
      const rango = document.createRange();
      rango.selectNodeContents(nodo);
      const cajas = [...rango.getClientRects()].filter((caja) => caja.width > 1 && caja.height > 1);
      if (cajas.length === 0) continue;
      encontrados++;
      if (cajas.some(interseca)) tapados.push(`texto "${nodo.textContent.trim().slice(0, 40)}"`);
    }

    const objetivos = [...document.querySelectorAll<HTMLElement>(selectorObjetivos)].filter(
      (elemento) =>
        elemento !== burbuja &&
        elemento.getBoundingClientRect().width > 1 &&
        elemento.checkVisibility({ visibilityProperty: true }),
    );
    for (const objetivo of objetivos) {
      if (interseca(objetivo.getBoundingClientRect())) {
        tapados.push(`objetivo ${objetivo.tagName.toLowerCase()} ${(objetivo.textContent ?? '').trim().slice(0, 40)}`);
      }
    }

    return {
      tapados,
      encontrados,
      objetivos: objetivos.length,
      alMaximo: Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) <= 1,
      burbujaVisible: cajaBurbuja.width > 1 && cajaBurbuja.bottom <= window.innerHeight + 0.5 && cajaBurbuja.top >= 0,
    };
  }, SELECTOR_OBJETIVOS);

test.describe('[interfaz] Elementos fijos sin tapar contenido', () => {
  test.setTimeout(180000);

  test.beforeEach(({ isMobile }) => {
    test.skip(Boolean(isMobile), 'el ancho se fija con el viewport del proyecto de escritorio');
  });

  test('Final de página en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      await esperarHidratacion(page);
      await alFinalDeLaPagina(page);
      const medida = await tapadoPorLaBurbuja(page);
      expect(medida.alMaximo, `${ruta} con el scroll al máximo`).toBe(true);
      expect(medida.burbujaVisible, `${ruta}: burbuja dentro del viewport`).toBe(true);
      expect(medida.encontrados, `${ruta}: líneas de texto visibles`).toBeGreaterThan(5);
      expect(medida.objetivos, `${ruta}: objetivos visibles`).toBeGreaterThan(0);
      expect(medida.tapados, ruta).toEqual([]);
    }
  });

  test('Safe areas de la burbuja', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/);
    const sesion = await page.context().newCDPSession(page);
    await sesion.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 34, left: 0, right: 30 } });
    const burbuja = page.locator('#burbuja-mercadolibre');
    const caja = await burbuja.boundingBox();
    expect(844 - (caja!.y + caja!.height)).toBeCloseTo(34, 0);
    expect(390 - (caja!.x + caja!.width)).toBeCloseTo(30, 0);
    await sesion.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 0, left: 0, right: 0 } });
    const normal = await burbuja.boundingBox();
    expect(844 - (normal!.y + normal!.height)).toBeCloseTo(20, 0);
    expect(390 - (normal!.x + normal!.width)).toBeCloseTo(20, 0);
  });
});
