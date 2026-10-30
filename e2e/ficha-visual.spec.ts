import { expect, test } from '@playwright/test';
import site from '../src/data/site.json' with { type: 'json' };
import { separarRotulo } from '../src/lib/caracteristicas';
import { esperarHidratacion } from './spec/_hidratacion';
import { muestras } from './spec/_muestras';

const MOVIL = { width: 390, height: 844 };
const ESCRITORIO = { width: 1280, height: 800 };

const conSeisFotos = muestras.fichas.find((ficha) =>
  (ficha.tipo === 'simple' ? ficha.imagenes : (ficha.grupos?.[0]?.colores?.[0]?.imagenes ?? ficha.imagenes)).length >= 6,
)!;
const tituloLargo = [...muestras.fichas].sort((a, b) => b.titulo.length - a.titulo.length)[0];

test.describe('ficha: galería, miga, enlace a la tienda y características', () => {
  test('las miniaturas van en una sola tira con scroll-snap, de 64 px, y la activa con anillo', async ({ page }) => {
    await page.setViewportSize(MOVIL);
    await page.goto(`/productos/${conSeisFotos.slug}/`);
    await esperarHidratacion(page);
    const miniaturas = page.getByRole('button', { name: /foto principal/i });
    expect(await miniaturas.count()).toBeGreaterThanOrEqual(6);
    const medidas = await miniaturas.evaluateAll((nodos) =>
      nodos.map((nodo) => {
        const caja = nodo.getBoundingClientRect();
        return { y: Math.round(caja.top), ancho: Math.round(caja.width), alto: Math.round(caja.height), alinea: getComputedStyle(nodo).scrollSnapAlign };
      }),
    );
    expect(new Set(medidas.map((medida) => medida.y)).size, 'una sola fila').toBe(1);
    expect(medidas.filter((medida) => medida.ancho !== 64 || medida.alto !== 64)).toEqual([]);
    expect(medidas.every((medida) => medida.alinea.startsWith('start'))).toBe(true);
    const tira = await miniaturas.first().evaluate((nodo) => {
      const estilo = getComputedStyle(nodo.parentElement!);
      return { desborde: estilo.overflowX, snap: estilo.scrollSnapType, ancho: nodo.parentElement!.getBoundingClientRect().width, recortada: nodo.parentElement!.scrollWidth > nodo.parentElement!.clientWidth };
    });
    expect(tira.desborde).toBe('auto');
    expect(tira.snap).toContain('x');
    expect(tira.ancho, 'la tira no ensancha la columna').toBeLessThanOrEqual(MOVIL.width);
    expect(tira.recortada, 'la tira se desliza').toBe(true);
    await expect(miniaturas.first()).toHaveAttribute('aria-pressed', 'true');
    const sombras = await miniaturas.evaluateAll((nodos) => nodos.slice(0, 2).map((nodo) => getComputedStyle(nodo).boxShadow));
    expect(sombras[0]).toContain('rgb(36, 69, 92) 0px 0px 0px 2px');
    expect(sombras[1]).not.toContain('rgb(36, 69, 92)');
  });

  for (const viewport of [MOVIL, ESCRITORIO]) {
    test(`la miga va en una línea con el ítem actual truncado y su texto completo en el DOM a ${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/productos/${tituloLargo.slug}/`);
      const miga = page.getByRole('navigation', { name: 'Ruta de navegación' });
      const items = await miga.locator('li').evaluateAll((nodos) => nodos.map((nodo) => Math.round(nodo.getBoundingClientRect().top + nodo.getBoundingClientRect().height / 2)));
      expect(new Set(items).size, 'una sola línea').toBe(1);
      const actual = miga.locator('[aria-current="page"]');
      await expect(actual).toHaveText(tituloLargo.titulo);
      const estilo = await actual.evaluate((nodo) => {
        const css = getComputedStyle(nodo);
        return { desborde: css.overflowX, puntos: css.textOverflow, ajuste: css.whiteSpace, recortado: nodo.scrollWidth > nodo.clientWidth };
      });
      expect(estilo).toMatchObject({ desborde: 'hidden', puntos: 'ellipsis', ajuste: 'nowrap' });
      if (viewport.width === MOVIL.width) expect(estilo.recortado).toBe(true);
      const altos = await miga.locator('a').evaluateAll((nodos) => nodos.map((nodo) => Math.round(nodo.getBoundingClientRect().height)));
      expect(altos.filter((alto) => alto < 44)).toEqual([]);
    });
  }

  for (const viewport of [MOVIL, ESCRITORIO]) {
    test(`«${site.ctaHeader}» es un enlace de texto bajo el CTA principal a ${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/productos/${muestras.fichaSimple.slug}/`);
      await esperarHidratacion(page);
      const enlace = page.getByRole('main').getByRole('link', { name: site.ctaHeader, exact: true });
      const cta = page.locator('[data-cta="ver-en-mercado-libre"]');
      const [cajaEnlace, cajaCta] = await Promise.all([enlace.boundingBox(), cta.boundingBox()]);
      expect(cajaEnlace!.y).toBeGreaterThanOrEqual(cajaCta!.y + cajaCta!.height);
      expect(cajaEnlace!.height).toBeGreaterThanOrEqual(44);
      const estilo = await enlace.evaluate((nodo) => {
        const css = getComputedStyle(nodo);
        return { color: css.color, fondo: css.backgroundColor, borde: css.borderTopWidth, peso: css.fontWeight, iconos: nodo.querySelectorAll('svg').length };
      });
      expect(estilo).toEqual({ color: 'rgb(138, 69, 23)', fondo: 'rgba(0, 0, 0, 0)', borde: '0px', peso: '700', iconos: 1 });
    });
  }

  test('los rótulos de las características van en negrita y el resto del ítem queda igual', async ({ page }) => {
    let conRotulo = 0;
    let sinRotulo = 0;
    for (const ficha of muestras.fichas.filter((candidata) => (candidata.caracteristicas ?? []).length > 0)) {
      await page.goto(`/productos/${ficha.slug}/`);
      const items = page.locator('section:has(> div > h2:text-is("Características")) li span');
      expect(await items.count(), ficha.slug).toBe(ficha.caracteristicas.length);
      for (const [indice, texto] of (ficha.caracteristicas as string[]).entries()) {
        const partes = separarRotulo(texto);
        const item = items.nth(indice);
        await expect(item, `${ficha.slug}: ${texto}`).toHaveText(texto);
        if (partes) {
          conRotulo++;
          await expect(item.locator('strong'), texto).toHaveText(partes.rotulo);
          expect(await item.locator('strong').evaluate((nodo) => getComputedStyle(nodo).fontWeight), texto).toBe('700');
        } else {
          sinRotulo++;
          await expect(item.locator('strong'), texto).toHaveCount(0);
        }
      }
    }
    expect(conRotulo).toBeGreaterThan(0);
    expect(sinRotulo).toBeGreaterThan(0);
  });
});
