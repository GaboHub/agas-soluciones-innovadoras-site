import { expect, test, type Page } from '@playwright/test';
import { getCampanasPublicables, getCuponesPublicables } from '../src/lib/promociones';
import { muestras } from './spec/_muestras';

const MOVIL = { width: 390, height: 844 };
const ESCRITORIO = { width: 1280, height: 800 };
const hayPromocionesPublicables = getCuponesPublicables().length + getCampanasPublicables().length > 0;
const tituloDePromocionesDeLaFicha = 'Promociones en nuestra tienda de Mercado Libre';
const rutaGuia = `/guias/${muestras.guias[0].slug}/`;
const fichaCompleta = muestras.fichas.find(
  (ficha) =>
    (ficha.caracteristicas ?? []).length > 0 &&
    (ficha.incluye ?? []).length > 0 &&
    muestras.guias.some((guia) => (guia.productosRelacionados as string[]).includes(ficha.slug)),
)!;

const altosDe = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((nodos) => nodos.map((nodo) => Math.round(nodo.getBoundingClientRect().height)));

const estiloDe = (page: Page, selector: string, propiedad: 'fontSize' | 'textWrapStyle') =>
  page.locator(selector).evaluateAll((nodos, campo) => nodos.map((nodo) => getComputedStyle(nodo)[campo]), propiedad);

const botonesDeAccion: Record<string, { ruta: string; selector: string }> = {
  'hero de la home': { ruta: '/', selector: 'main > section:first-of-type a' },
  'enlace a guías de la home': { ruta: '/', selector: 'main a[href="/guias/"]' },
  'panel de cierre de la home': { ruta: '/', selector: 'main > section:last-of-type a' },
  contacto: { ruta: '/contacto/', selector: 'main a[target="_blank"]' },
  'estado vacío de promociones': { ruta: '/promociones/', selector: '#promo-fallback a' },
  'reseñas de la home': { ruta: '/', selector: 'section[aria-labelledby="resenas-titulo"] a[target="_blank"]' },
  '404': { ruta: '/404.html', selector: 'main a' },
};

const h2DeSeccion: Record<string, { ruta: string; selector: string }> = {
  home: { ruta: '/', selector: 'main h2' },
  categoría: { ruta: `/categorias/${muestras.fichas[0].categoria}/`, selector: 'main h2' },
  promociones: { ruta: '/promociones/', selector: 'main h2' },
  guía: { ruta: rutaGuia, selector: 'main h2' },
};

test.describe('escala visual', () => {
  for (const [nombre, { ruta, selector }] of Object.entries(botonesDeAccion)) {
    test(`botón de acción de 48 px: ${nombre}`, async ({ page }) => {
      for (const viewport of [MOVIL, ESCRITORIO]) {
        await page.setViewportSize(viewport);
        await page.goto(ruta);
        const altos = await altosDe(page, selector);
        if (nombre === 'estado vacío de promociones' && hayPromocionesPublicables) {
          expect(altos, `${nombre}: hay promociones publicables`).toEqual([]);
          continue;
        }
        expect(altos.length, `${ruta} ${selector}`).toBeGreaterThan(0);
        expect(altos.filter((alto) => alto !== 48), `${nombre} a ${viewport.width}px`).toEqual([]);
      }
    });
  }

  for (const [nombre, { ruta, selector }] of Object.entries(h2DeSeccion)) {
    test(`h2 de sección de 24 px en móvil y 30 px en escritorio: ${nombre}`, async ({ page }) => {
      for (const [viewport, esperado] of [[MOVIL, '24px'], [ESCRITORIO, '30px']] as const) {
        await page.setViewportSize(viewport);
        await page.goto(ruta);
        const tamanos = await estiloDe(page, selector, 'fontSize');
        expect(tamanos.length, ruta).toBeGreaterThan(0);
        expect(tamanos.filter((tamano) => tamano !== esperado), `${nombre} a ${viewport.width}px`).toEqual([]);
      }
    });
  }

  test('los h2 de sección de la ficha son de 24 px en móvil y 30 px en escritorio', async ({ page }) => {
    expect(fichaCompleta).toBeDefined();
    for (const [viewport, esperado] of [[MOVIL, '24px'], [ESCRITORIO, '30px']] as const) {
      await page.setViewportSize(viewport);
      await page.goto(`/productos/${fichaCompleta.slug}/`);
      const titulos = await page.locator('main h2').allTextContents();
      const textos = titulos.map((texto) => texto.trim());
      for (const titulo of ['Características', 'Qué incluye', 'Guías que te pueden servir']) {
        expect(textos, `${fichaCompleta.slug} a ${viewport.width}px`).toContain(titulo);
      }
      if (hayPromocionesPublicables) expect(textos, `${fichaCompleta.slug} a ${viewport.width}px`).toContain(tituloDePromocionesDeLaFicha);
      else expect(textos, `${fichaCompleta.slug} a ${viewport.width}px`).not.toContain(tituloDePromocionesDeLaFicha);
      const tamanos = await estiloDe(page, 'main h2', 'fontSize');
      expect(tamanos.filter((tamano) => tamano !== esperado), `${fichaCompleta.slug} a ${viewport.width}px`).toEqual([]);
    }
  });

  test('el h2 de reseñas de la ficha es de 24 px en móvil y 30 px en escritorio', async ({ page }) => {
    const conReseñas = muestras.fichas.find((ficha) => (ficha.reviews?.cantidad ?? 0) > 0)!;
    expect(conReseñas).toBeDefined();
    for (const [viewport, esperado] of [[MOVIL, '24px'], [ESCRITORIO, '30px']] as const) {
      await page.setViewportSize(viewport);
      await page.goto(`/productos/${conReseñas.slug}/`);
      expect(await estiloDe(page, '#reviews-titulo', 'fontSize'), `${conReseñas.slug} a ${viewport.width}px`).toEqual([esperado]);
    }
  });

  test('los h2 de las secciones de promociones publicables son de sección: 24 px en móvil y 30 px en escritorio', async ({ page }) => {
    const secciones = [
      ...(getCuponesPublicables().length > 0 ? ['cupones'] : []),
      ...(getCampanasPublicables().length > 0 ? ['campanas'] : []),
    ];
    for (const [viewport, esperado] of [[MOVIL, '24px'], [ESCRITORIO, '30px']] as const) {
      await page.setViewportSize(viewport);
      await page.goto('/promociones/');
      if (secciones.length === 0) await expect(page.locator('#promo-fallback')).toHaveCount(1);
      for (const seccion of secciones) {
        await expect(page.locator(`#${seccion} > h2`), `${seccion} a ${viewport.width}px`).toHaveCount(1);
        expect(await estiloDe(page, `#${seccion} > h2`, 'fontSize'), `${seccion} a ${viewport.width}px`).toEqual([esperado]);
      }
    }
  });

  test('chips de «Otras categorías» de al menos 44 px en móvil', async ({ page }) => {
    await page.setViewportSize(MOVIL);
    await page.goto('/categorias/audio/');
    const altos = await altosDe(page, 'main > section:last-of-type a');
    expect(altos.length).toBeGreaterThan(0);
    expect(altos.filter((alto) => alto < 44)).toEqual([]);
  });

  test('enlaces del footer de 44 px o más en móvil y compactos en escritorio', async ({ page }) => {
    await page.setViewportSize(MOVIL);
    await page.goto('/');
    const enMovil = await altosDe(page, 'footer ul a');
    expect(enMovil.length).toBeGreaterThan(0);
    expect(enMovil.filter((alto) => alto < 44)).toEqual([]);
    await page.setViewportSize(ESCRITORIO);
    const enEscritorio = await altosDe(page, 'footer ul a');
    expect(enEscritorio.filter((alto) => alto >= 44)).toEqual([]);
  });

  for (const [nombre, ruta, selector] of [
    ['contacto', '/contacto/', 'main a[href^="mailto:"]'],
    ['footer', '/', 'footer a[href^="mailto:"]'],
  ]) {
    test(`el correo de ventas por volumen no se corta dentro del dominio a 390 px: ${nombre}`, async ({ page }) => {
      await page.setViewportSize(MOVIL);
      await page.goto(ruta);
      const correo = page.locator(selector);
      await expect(correo.locator('wbr')).toHaveCount(1);
      const medida = await correo.evaluate((enlace) => {
        const texto = enlace.textContent ?? '';
        const arroba = texto.indexOf('@');
        const nodos: { nodo: Text; desde: number }[] = [];
        const recorrido = document.createTreeWalker(enlace, NodeFilter.SHOW_TEXT);
        for (let desde = 0, nodo = recorrido.nextNode() as Text | null; nodo; nodo = recorrido.nextNode() as Text | null) {
          nodos.push({ nodo, desde });
          desde += nodo.length;
        }
        const altoDelCaracter = (indice: number) => {
          const { nodo, desde } = nodos.filter((candidato) => candidato.desde <= indice).at(-1)!;
          const rango = document.createRange();
          rango.setStart(nodo, indice - desde);
          rango.setEnd(nodo, indice - desde + 1);
          return Math.round(rango.getBoundingClientRect().top);
        };
        const lineas = new Set<number>();
        for (let indice = arroba; indice < texto.length; indice++) lineas.add(altoDelCaracter(indice));
        return { texto, lineasDelDominio: lineas.size, antesDeLaArroba: enlace.querySelector('wbr')!.nextSibling?.textContent?.startsWith('@') };
      });
      expect(medida.antesDeLaArroba).toBe(true);
      expect(medida.lineasDelDominio).toBe(1);
    });
  }

  test('text-wrap pretty en los párrafos', async ({ page }) => {
    for (const ruta of ['/', '/promociones/', rutaGuia]) {
      await page.goto(ruta);
      const estilos = await estiloDe(page, 'main p:not(.text-balance)', 'textWrapStyle');
      expect(estilos.length, ruta).toBeGreaterThan(0);
      expect(estilos.filter((estilo) => estilo !== 'pretty'), ruta).toEqual([]);
    }
  });

  test('el enlace de todas las preguntas frecuentes alinea con el borde del bloque FAQ', async ({ page }) => {
    for (const viewport of [MOVIL, ESCRITORIO]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const [bloque, enlace] = await Promise.all(
        ['#faq-titulo', 'main a[href="/preguntas-frecuentes/"]'].map((selector) =>
          page.locator(selector).evaluate((nodo) => nodo.getBoundingClientRect().left),
        ),
      );
      expect(Math.abs(enlace - bloque), `${viewport.width}px`).toBeLessThanOrEqual(1);
    }
  });

  test('text-wrap balance en h1, h2 y h3', async ({ page }) => {
    const vistos: Record<string, number> = { h1: 0, h2: 0, h3: 0 };
    for (const ruta of ['/', '/promociones/', rutaGuia, '/productos/']) {
      await page.goto(ruta);
      await page.evaluate(() => document.querySelector('main')!.append(document.createElement('h3')));
      for (const etiqueta of Object.keys(vistos)) {
        const estilos = await estiloDe(page, `main ${etiqueta}`, 'textWrapStyle');
        vistos[etiqueta] += estilos.length;
        expect(estilos.filter((estilo) => estilo !== 'balance'), `${ruta} ${etiqueta}`).toEqual([]);
      }
    }
    expect(Object.values(vistos).every((cantidad) => cantidad > 0), JSON.stringify(vistos)).toBe(true);
  });
});
