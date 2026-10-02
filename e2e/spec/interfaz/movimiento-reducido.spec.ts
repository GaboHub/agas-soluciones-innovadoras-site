import { expect, test, type Page } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { paginasDeMuestra } from '../_muestras';

const transicionesDeTransformacion = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const propiedadesDeTransformacion = ['transform', 'translate', 'scale', 'rotate', 'all'];
    const segundos = (duracion: string) => parseFloat(duracion) * (duracion.endsWith('ms') ? 0.001 : 1);
    return [...document.querySelectorAll('*')]
      .filter((elemento) => {
        const estilo = getComputedStyle(elemento);
        const propiedades = estilo.transitionProperty.split(',').map((propiedad) => propiedad.trim());
        const duraciones = estilo.transitionDuration.split(',').map((duracion) => duracion.trim());
        return propiedades.some(
          (propiedad, indice) =>
            propiedadesDeTransformacion.includes(propiedad) && segundos(duraciones[indice % duraciones.length]) > 0,
        );
      })
      .map((elemento) => `${elemento.tagName.toLowerCase()}.${String(elemento.getAttribute('class')).slice(0, 60)}`);
  });

test.describe('[interfaz] Movimiento reducido', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('Preferencia activa', async ({ page }) => {
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      await esperarHidratacion(page);
      const scroll = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
      expect(scroll, ruta).toBe('auto');
      expect(await transicionesDeTransformacion(page), ruta).toEqual([]);
    }
  });

  test('Hover sin transformación', async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), 'en móvil los estilos hover no aplican');
    let probados = 0;
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      await esperarHidratacion(page);
      const candidatos = page.locator(
        '[class*="hover:scale"], [class*="hover:-translate"], [class*="hover:translate"], [class*="hover:rotate"], [class*="hover:-rotate"]',
      );
      const cantidad = await candidatos.count();
      for (let indice = 0; indice < cantidad; indice++) {
        const candidato = candidatos.nth(indice);
        if (!(await candidato.isVisible())) continue;
        await candidato.hover();
        probados++;
        const transformacion = await candidato.evaluate((elemento) => {
          const estilo = getComputedStyle(elemento);
          return [estilo.transform, estilo.translate, estilo.scale, estilo.rotate].join('|');
        });
        expect(transformacion, `${ruta} #${indice}`).toBe('none|none|none|none');
        expect(await transicionesDeTransformacion(page), `${ruta} #${indice} con hover`).toEqual([]);
      }
    }
    expect(probados).toBeGreaterThan(0);
  });
});
