import { expect, test, type Page } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { muestras } from '../_muestras';

const margenesDelVisor = async (page: Page) => {
  const visor = page.locator('dialog[open]');
  await expect(visor).toBeVisible();
  await page.waitForFunction(() => {
    const imagen = document.querySelector<HTMLImageElement>('dialog[open] img');
    return Boolean(imagen?.complete && imagen.naturalWidth > 0);
  });
  return page.evaluate(() => {
    const caja = document.querySelector('dialog[open]')!.getBoundingClientRect();
    const { clientWidth, clientHeight } = document.documentElement;
    return {
      izquierdo: caja.left,
      derecho: clientWidth - caja.right,
      superior: caja.top,
      inferior: clientHeight - caja.bottom,
      ancho: caja.width,
      alto: caja.height,
      clientWidth,
      clientHeight,
    };
  });
};

const viewports = [
  { nombre: 'móvil', width: 390, height: 844 },
  { nombre: 'escritorio', width: 1280, height: 720 },
];

test.describe('[interfaz] Visor modal centrado', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(Boolean(isMobile), 'los viewports se fijan en el proyecto de escritorio');
  });

  test('Centrado', async ({ page }) => {
    for (const { nombre, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto(`/productos/${muestras.fichaConGrupos.slug}/`);
      await esperarHidratacion(page);
      await page.getByRole('button', { name: /Ampliar foto/ }).click();
      const margenes = await margenesDelVisor(page);
      expect(margenes.ancho, nombre).toBeLessThan(margenes.clientWidth);
      expect(margenes.alto, nombre).toBeLessThan(margenes.clientHeight);
      expect(Math.abs(margenes.izquierdo - margenes.derecho), `${nombre}: horizontal`).toBeLessThanOrEqual(1);
      expect(Math.abs(margenes.superior - margenes.inferior), `${nombre}: vertical`).toBeLessThanOrEqual(1);
    }
  });
});
