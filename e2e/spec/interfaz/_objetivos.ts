import type { Page } from '@playwright/test';

export interface Objetivo {
  rotulo: string;
  ancho: number;
  alto: number;
  arriba: number;
  abajo: number;
  izquierda: number;
  derecha: number;
  enParrafo: boolean;
}

export const SELECTOR_OBJETIVOS = 'a[href], button, summary, select';

export const medirObjetivos = (page: Page, selector = SELECTOR_OBJETIVOS): Promise<Objetivo[]> =>
  page.evaluate(
    (selectorBuscado) =>
      [...document.querySelectorAll<HTMLElement>(selectorBuscado)]
        .map((elemento) => ({ elemento, caja: elemento.getBoundingClientRect() }))
        .filter(
          ({ elemento, caja }) =>
            caja.width > 1 && caja.height > 1 && elemento.checkVisibility({ visibilityProperty: true }),
        )
        .map(({ elemento, caja }) => ({
          rotulo: `${elemento.tagName.toLowerCase()} ${(elemento.getAttribute('aria-label') ?? elemento.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)}`,
          ancho: caja.width,
          alto: caja.height,
          arriba: caja.top + window.scrollY,
          abajo: caja.bottom + window.scrollY,
          izquierda: caja.left,
          derecha: caja.right,
          enParrafo: elemento.closest('p') !== null,
        })),
    selector,
  );

export const separacion = (a: Objetivo, b: Objetivo): number =>
  Math.max(
    Math.max(a.izquierda, b.izquierda) - Math.min(a.derecha, b.derecha),
    Math.max(a.arriba, b.arriba) - Math.min(a.abajo, b.abajo),
  );

export const sinAreaMinima = (objetivos: Objetivo[]): string[] =>
  objetivos
    .filter((objetivo) => !objetivo.enParrafo && (objetivo.ancho < 44 || objetivo.alto < 44))
    .map((objetivo) => `${objetivo.rotulo} (${Math.round(objetivo.ancho)}x${Math.round(objetivo.alto)})`);

export const bajosYJuntos = (objetivos: Objetivo[]): string[] => {
  const bajos = objetivos.filter((objetivo) => !objetivo.enParrafo && objetivo.alto < 44);
  return bajos.flatMap((objetivo, indice) =>
    bajos
      .slice(indice + 1)
      .filter((otro) => separacion(objetivo, otro) < 8)
      .map((otro) => `${objetivo.rotulo} / ${otro.rotulo}`),
  );
};
