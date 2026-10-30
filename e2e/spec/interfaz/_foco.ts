import { expect, type Page } from '@playwright/test';
import {
  aMedidaSobreDegradado,
  componer,
  medirSobreDegradado,
  parsearColor,
  razonDeContraste,
  razonMinimaSobreDegradado,
  type Rgba,
} from './_contraste';

const BLANCO: Rgba = [255, 255, 255, 1];

const fondoCompuesto = (fondos: string[]): Rgba =>
  fondos.map(parsearColor).reduce<Rgba>((debajo, capa) => componer(capa, debajo), BLANCO);

export async function enfocarConTeclado(page: Page, selector: string): Promise<void> {
  await page.keyboard.press('Tab');
  const elemento = page.locator(selector).first();
  await elemento.focus();
  expect(await elemento.evaluate((nodo) => nodo.matches(':focus-visible')), selector).toBe(true);
}

export async function razonDelIndicador(page: Page, selector: string): Promise<number> {
  await enfocarConTeclado(page, selector);
  const sobreDegradado = await medirSobreDegradado(page, selector, 'outlineColor');
  if (sobreDegradado.existe) return razonMinimaSobreDegradado(aMedidaSobreDegradado(sobreDegradado));
  const medida = await page.locator(selector).first().evaluate((nodo) => {
    const fondos: string[] = [];
    for (let actual = nodo.parentElement; actual; actual = actual.parentElement) {
      fondos.unshift(getComputedStyle(actual).backgroundColor);
    }
    return { fondos, indicador: getComputedStyle(nodo).outlineColor };
  });
  const fondo = fondoCompuesto(medida.fondos);
  return razonDeContraste(parsearColor(medida.indicador), fondo);
}

export const alFinalDeLaPagina = (page: Page) =>
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

export async function razonDelAnilloDeLaBurbuja(page: Page, enElFooter: boolean): Promise<number> {
  await enfocarConTeclado(page, '#burbuja-mercadolibre');
  const medida = await page.evaluate(() => {
    const burbuja = document.getElementById('burbuja-mercadolibre')!;
    const caja = burbuja.getBoundingClientRect();
    const debajo = document
      .elementsFromPoint(caja.left + caja.width / 2, caja.top + caja.height / 2)
      .filter((nodo) => !burbuja.contains(nodo))[0];
    const fondos: string[] = [];
    for (let actual: Element | null = debajo; actual; actual = actual.parentElement) {
      fondos.unshift(getComputedStyle(actual).backgroundColor);
    }
    const estilo = getComputedStyle(burbuja);
    return {
      enElFooter: !!debajo.closest('footer'),
      fondos,
      outline: estilo.outlineColor,
      alcanceDelOutline: parseFloat(estilo.outlineOffset) + parseFloat(estilo.outlineWidth),
      sombras: estilo.boxShadow,
    };
  });
  expect(medida.enElFooter).toBe(enElFooter);
  const fondo = fondoCompuesto(medida.fondos);
  const sombrasQueAsoman = [
    ...medida.sombras.matchAll(/(rgba?\([^)]*\))\s+-?[\d.]+px\s+-?[\d.]+px\s+0px\s+(-?[\d.]+)px/g),
  ]
    .filter((coincidencia) => Number(coincidencia[2]) > medida.alcanceDelOutline)
    .map((coincidencia) => coincidencia[1]);
  const anillo = [medida.outline, ...sombrasQueAsoman].map(parsearColor).filter((color) => color[3] === 1);
  return Math.max(...anillo.map((color) => razonDeContraste(color, fondo)));
}
