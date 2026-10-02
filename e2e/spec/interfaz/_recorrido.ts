import type { Page } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';

export interface PasoDeFoco {
  etiqueta: string;
  enElHeader: boolean;
  tapadoPorElHeader: boolean;
  outlineStyle: string;
  outlineWidth: number;
}

const enReposo = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let ultimo = -1;
        let estables = 0;
        const paso = () => {
          estables = window.scrollY === ultimo ? estables + 1 : 0;
          ultimo = window.scrollY;
          if (estables >= 4) resolve();
          else requestAnimationFrame(paso);
        };
        paso();
      }),
  );

const leerFoco = (page: Page): Promise<(PasoDeFoco & { repetido: boolean }) | null> =>
  page.evaluate(() => {
    const elemento = document.activeElement as HTMLElement | null;
    if (!elemento || elemento === document.body || elemento === document.documentElement) return null;
    const visitados = ((window as unknown as { __visitados?: WeakSet<Element> }).__visitados ??= new WeakSet());
    const repetido = visitados.has(elemento);
    visitados.add(elemento);
    const header = document.querySelector('header')!;
    const caja = elemento.getBoundingClientRect();
    const cajaHeader = header.getBoundingClientRect();
    const enElHeader = header.contains(elemento);
    const solapa =
      caja.width > 0 &&
      caja.height > 0 &&
      caja.top < cajaHeader.bottom &&
      caja.bottom > cajaHeader.top &&
      caja.left < cajaHeader.right &&
      caja.right > cajaHeader.left;
    const estilo = getComputedStyle(elemento);
    return {
      etiqueta: `${elemento.tagName.toLowerCase()} ${(elemento.getAttribute('aria-label') ?? elemento.textContent ?? '').trim().slice(0, 40)}`,
      enElHeader,
      tapadoPorElHeader: !enElHeader && solapa,
      outlineStyle: estilo.outlineStyle,
      outlineWidth: parseFloat(estilo.outlineWidth),
      repetido,
    };
  });

export async function recorrerConTeclado(page: Page, ruta: string, tecla: 'Tab' | 'Shift+Tab'): Promise<PasoDeFoco[]> {
  await page.goto(ruta);
  await esperarHidratacion(page);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const pasos: PasoDeFoco[] = [];
  for (let numero = 0; numero < 400; numero++) {
    await page.keyboard.press(tecla);
    await enReposo(page);
    const paso = await leerFoco(page);
    if (!paso || paso.repetido) break;
    pasos.push(paso);
  }
  return pasos;
}
