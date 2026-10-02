import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { paginasDeMuestra } from '../_muestras';
import {
  aMedidaDePlaceholder,
  aMedidaSobreDegradado,
  medirPlaceholder,
  medirSobreDegradado,
  minimoRequerido,
  razonDePlaceholder,
  razonMinimaSobreDegradado,
} from './_contraste';

test.describe('[interfaz] Contraste del texto renderizado', () => {
  test.setTimeout(180000);

  test('Páginas de muestra', async ({ page }) => {
    let medidosSobreDegradado = 0;
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      await esperarHidratacion(page);
      const { violations, incomplete } = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      const detalle = violations.flatMap((violacion) =>
        violacion.nodes.map((nodo) => `${ruta}: ${nodo.target.join(' ')} ${nodo.any[0]?.message ?? ''}`),
      );
      expect(detalle).toEqual([]);

      const sinMedir: string[] = [];
      const bajoElMinimo: string[] = [];
      for (const nodo of incomplete.flatMap((resultado) => resultado.nodes)) {
        const selector = nodo.target.join(' ');
        const motivo = String(nodo.any[0]?.data?.messageKey ?? nodo.any[0]?.message ?? 'sin motivo');
        if (motivo !== 'bgGradient' || nodo.target.length !== 1) {
          sinMedir.push(`${ruta}: ${selector} (${motivo})`);
          continue;
        }
        const crudo = await medirSobreDegradado(page, selector);
        if (!crudo.existe) {
          sinMedir.push(`${ruta}: ${selector} (sin ancestro con degradado)`);
          continue;
        }
        const medida = aMedidaSobreDegradado(crudo);
        const razon = razonMinimaSobreDegradado(medida);
        const minimo = minimoRequerido(medida.tamano, medida.peso);
        medidosSobreDegradado++;
        if (razon < minimo) bajoElMinimo.push(`${ruta}: ${selector} ${razon.toFixed(2)}:1 < ${minimo}:1`);
      }
      expect(sinMedir).toEqual([]);
      expect(bajoElMinimo).toEqual([]);
    }
    expect(medidosSobreDegradado).toBeGreaterThan(0);
  });

  test('Placeholders', async ({ page }) => {
    let medidos = 0;
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      await esperarHidratacion(page);
      const total = await page.locator('input[placeholder], textarea[placeholder]').count();
      for (let indice = 0; indice < total; indice++) {
        await page.locator('input[placeholder], textarea[placeholder]').nth(indice).evaluate((elemento, posicion) => {
          elemento.setAttribute('data-medir-placeholder', String(posicion));
        }, indice);
        const razon = razonDePlaceholder(
          aMedidaDePlaceholder(await medirPlaceholder(page, `[data-medir-placeholder="${indice}"]`)),
        );
        medidos++;
        expect(razon, `${ruta}: placeholder ${indice}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(medidos).toBeGreaterThan(0);
  });
});
