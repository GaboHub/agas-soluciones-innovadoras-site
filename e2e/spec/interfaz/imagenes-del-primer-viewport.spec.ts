import { expect, test, type Page } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import site from '../../../src/data/site.json' with { type: 'json' };
import { muestras, paginasDeMuestra } from '../_muestras';

const viewports = [
  { nombre: 'móvil', width: 390, height: 844 },
  { nombre: 'escritorio', width: 1280, height: 720 },
];

const imagenesDelPrimerViewport = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>('img')]
      .map((imagen) => ({ imagen, caja: imagen.getBoundingClientRect() }))
      .filter(
        ({ imagen, caja }) =>
          caja.width > 0 &&
          caja.height > 0 &&
          imagen.checkVisibility({ visibilityProperty: true }) &&
          caja.bottom > 0 &&
          caja.top < window.innerHeight &&
          caja.right > 0 &&
          caja.left < window.innerWidth,
      )
      .map(({ imagen }) => ({
        origen: imagen.getAttribute('src') ?? '',
        carga: imagen.getAttribute('loading'),
        enElHeader: imagen.closest('header') !== null,
      })),
  );

const cargarTodasLasImagenes = async (page: Page) => {
  await page.evaluate(async () => {
    const paso = Math.max(200, window.innerHeight - 100);
    for (let y = 0; y < document.documentElement.scrollHeight; y += paso) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    document.querySelectorAll('img').forEach((imagen) => {
      imagen.loading = 'eager';
    });
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('img')]
      .filter((imagen) => imagen.getBoundingClientRect().width > 0)
      .every((imagen) => imagen.complete && imagen.naturalWidth > 0),
  );
};

const imagenesVisibles = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>('img')]
      .filter((imagen) => imagen.getBoundingClientRect().width > 0 && imagen.checkVisibility({ visibilityProperty: true }))
      .map((imagen) => ({
        origen: imagen.getAttribute('src') ?? '',
        srcset: imagen.getAttribute('srcset'),
        natural: imagen.naturalWidth,
        mostrado: imagen.getBoundingClientRect().width,
        densidad: window.devicePixelRatio,
      })),
  );

test.describe('[interfaz] Imágenes del primer viewport', () => {
  test.setTimeout(180000);
  test.use({ deviceScaleFactor: 1 });

  test.beforeEach(({ isMobile }) => {
    test.skip(Boolean(isMobile), 'los viewports se fijan en el proyecto de escritorio');
  });

  test('Logo y primera fila', async ({ page }) => {
    const lazy: string[] = [];
    for (const { nombre, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      let imagenesDeContenido = 0;
      for (const ruta of paginasDeMuestra) {
        await page.goto(ruta);
        await esperarHidratacion(page);
        const imagenes = await imagenesDelPrimerViewport(page);
        expect(
          imagenes.filter((imagen) => imagen.enElHeader).length,
          `${nombre} ${ruta}: logo del header`,
        ).toBeGreaterThan(0);
        imagenesDeContenido += imagenes.filter((imagen) => !imagen.enElHeader).length;
        lazy.push(
          ...imagenes.filter((imagen) => imagen.carga === 'lazy').map((imagen) => `${nombre} ${ruta}: ${imagen.origen}`),
        );
      }
      expect(imagenesDeContenido, `${nombre}: imágenes de contenido en el primer viewport`).toBeGreaterThan(0);
    }
    expect(lazy).toEqual([]);
  });

  test('Primera fila de tarjetas', async ({ page }) => {
    const categoria = site.categorias.find((candidata) => candidata.productos.length >= 4);
    expect(categoria, 'una categoría con al menos 4 productos').toBeDefined();
    const rutas = ['/', '/productos/', `/categorias/${categoria!.slug}/`, `/guias/${muestras.guia.slug}/`];
    const lazy: string[] = [];
    for (const { nombre, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      for (const ruta of rutas) {
        await page.goto(ruta);
        await esperarHidratacion(page);
        const tarjetas = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLImageElement>('main a[href^="/productos/"] img')].map((imagen) => ({
            origen: imagen.getAttribute('src') ?? '',
            carga: imagen.getAttribute('loading'),
          })),
        );
        expect(tarjetas.length, `${nombre} ${ruta}: tarjetas`).toBeGreaterThan(0);
        lazy.push(...tarjetas.slice(0, 4).filter((tarjeta) => tarjeta.carga === 'lazy').map((tarjeta) => `${nombre} ${ruta}: ${tarjeta.origen}`));
      }
    }
    expect(lazy).toEqual([]);
  });

  test('Miniaturas', async ({ page }) => {
    await page.goto(`/productos/${muestras.fichaConGrupos.slug}/`);
    await esperarHidratacion(page);
    const miniaturas = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLImageElement>('button[aria-pressed] img')].map((imagen) => ({
        origen: imagen.getAttribute('src') ?? '',
        srcset: imagen.getAttribute('srcset'),
        natural: imagen.naturalWidth,
        mostrado: imagen.getBoundingClientRect().width,
        densidad: window.devicePixelRatio,
      })),
    );
    expect(miniaturas.length).toBeGreaterThan(1);
    expect(
      miniaturas
        .filter((miniatura) => !miniatura.srcset && miniatura.natural > 2 * miniatura.mostrado * miniatura.densidad)
        .map((miniatura) => `${miniatura.origen}: ${miniatura.natural}px para ${miniatura.mostrado}px mostrados`),
    ).toEqual([]);
  });

  test('Toda imagen de las páginas de muestra', async ({ page }) => {
    test.setTimeout(240000);
    const excedidas: string[] = [];
    for (const { nombre, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      let analizadas = 0;
      for (const ruta of paginasDeMuestra) {
        await page.goto(ruta);
        await esperarHidratacion(page);
        await cargarTodasLasImagenes(page);
        const imagenes = await imagenesVisibles(page);
        expect(imagenes.length, `${nombre} ${ruta}: imágenes visibles`).toBeGreaterThan(0);
        expect(imagenes.every((imagen) => imagen.densidad === 1)).toBe(true);
        analizadas += imagenes.length;
        excedidas.push(
          ...imagenes
            .filter((imagen) => !imagen.srcset && imagen.natural > 2 * imagen.mostrado)
            .map((imagen) => `${nombre} ${ruta}: ${imagen.origen} (${imagen.natural}px para ${Math.round(imagen.mostrado)}px)`),
        );
      }
      expect(analizadas, `${nombre}: imágenes analizadas`).toBeGreaterThan(paginasDeMuestra.length);
    }
    expect(excedidas).toEqual([]);
  });
});
