import { expect, test } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { muestras } from '../_muestras';

test.describe('[interfaz] Texto legible en móvil', () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(Boolean(isMobile), 'el ancho se fija con el viewport del proyecto de escritorio');
  });

  test('Selector de opciones', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(`/productos/${muestras.fichaConGrupos.slug}/`);
    await esperarHidratacion(page);

    const tamanos = await page.evaluate(() => {
      const tamano = (elemento: Element) => parseFloat(getComputedStyle(elemento).fontSize);
      return {
        campos: [...document.querySelectorAll('input, select')].map((elemento) => ({
          campo: elemento.tagName.toLowerCase(),
          tamano: tamano(elemento),
        })),
        resumen: [...document.querySelectorAll('[data-testid="badge-envio"] + p')].map(tamano),
      };
    });

    expect(tamanos.campos.map(({ campo }) => campo)).toContain('select');
    expect(tamanos.campos.filter(({ tamano }) => tamano < 16)).toEqual([]);
    expect(tamanos.resumen.length).toBeGreaterThan(0);
    expect(tamanos.resumen.filter((tamano) => tamano < 16)).toEqual([]);
  });

  test('Campo de búsqueda del catálogo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/productos/');
    await esperarHidratacion(page);
    const campos = await page.evaluate(() =>
      [...document.querySelectorAll('input, select')].map((elemento) => parseFloat(getComputedStyle(elemento).fontSize)),
    );
    expect(campos.length).toBeGreaterThan(0);
    expect(campos.filter((tamano) => tamano < 16)).toEqual([]);
  });
});
