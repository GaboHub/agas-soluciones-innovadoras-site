import { expect, test, type Page } from '@playwright/test';
import resenas from '../src/data/resenas.json' with { type: 'json' };
import site from '../src/data/site.json' with { type: 'json' };
import { muestras } from './spec/_muestras';

const movil = (page: Page, ancho = 390) => page.setViewportSize({ width: ancho, height: 844 });
const escritorio = (page: Page) => page.setViewportSize({ width: 1280, height: 800 });

const categoria = muestras.fichas.find((ficha) => (ficha.reviews?.cantidad ?? 0) > 0)!.categoria as string;
const listados = {
  catálogo: { ruta: '/productos/', tarjeta: 'main ul > li > a[href^="/productos/"]' },
  categoría: { ruta: `/categorias/${categoria}/`, tarjeta: 'main a[href^="/productos/"]:has(img)' },
};

const medirTarjeta = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((tarjetas) => {
    const tarjeta = tarjetas.find((candidata) => /\(\d+\)/.test(candidata.textContent!))!;
    const visible = (nodo: Element) => getComputedStyle(nodo).display !== 'none' && nodo.getBoundingClientRect().width > 0;
    const imagen = tarjeta.querySelector('img')!;
    const titulo = [...tarjeta.querySelectorAll('p')].find((p) => p.className.includes('font-titulos') && p.className.includes('text-base'))
      ?? [...tarjeta.querySelectorAll('p')].find((p) => p.className.includes('font-titulos'))!;
    const cuerpo = imagen.parentElement!.nextElementSibling!;
    const verProducto = [...tarjeta.querySelectorAll('span')].find((span) => span.textContent!.trim().startsWith('Ver producto'))!;
    const estrellas = [...tarjeta.querySelectorAll('svg')].filter((svg) => visible(svg) && svg.querySelector('path')?.getAttribute('d')?.startsWith('M12 2.5'));
    const estiloTitulo = getComputedStyle(titulo);
    return {
      altoDeFoto: Math.round(imagen.getBoundingClientRect().height),
      relleno: getComputedStyle(cuerpo).paddingLeft,
      rellenoDeFoto: getComputedStyle(imagen.parentElement!).paddingLeft,
      tamanoDeTitulo: estiloTitulo.fontSize,
      balanceado: estiloTitulo.textWrapStyle,
      verProductoVisible: visible(verProducto),
      estrellasVisibles: estrellas.length,
      textoDeResena: [...tarjeta.querySelectorAll('span')].filter(visible).map((span) => span.textContent!.trim()).filter((texto) => /^\(\d+\)$/.test(texto) || /^\d\.\d$/.test(texto)),
    };
  });

const medirCandidatas = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((imagenes) =>
    imagenes.filter((nodo) => (nodo as HTMLImageElement).currentSrc).map((nodo) => {
      const imagen = nodo as HTMLImageElement;
      const candidatas = imagen.srcset.split(',').map((candidata) => candidata.trim().split(/\s+/));
      const elegida = candidatas.find(([url]) => url === new URL(imagen.currentSrc).pathname);
      return { mostrado: Math.max(imagen.getBoundingClientRect().width, imagen.getBoundingClientRect().height), elegido: elegida ? parseInt(elegida[1], 10) : Number.NaN };
    }),
  );

test.describe('listados: tarjeta compacta en móvil', () => {
  for (const [nombre, { ruta, tarjeta }] of Object.entries(listados)) {
    test(`la tarjeta del ${nombre} se compacta bajo 640 px y vuelve a su tamaño desde 640 px`, async ({ page }) => {
      await movil(page);
      await page.goto(ruta);
      const enMovil = await medirTarjeta(page, tarjeta);
      expect(enMovil).toMatchObject({
        altoDeFoto: 112,
        relleno: '12px',
        rellenoDeFoto: '12px',
        tamanoDeTitulo: '14px',
        balanceado: 'balance',
        verProductoVisible: false,
        estrellasVisibles: 1,
      });
      expect(enMovil.textoDeResena).toHaveLength(2);
      await escritorio(page);
      const enEscritorio = await medirTarjeta(page, tarjeta);
      expect(enEscritorio).toMatchObject({
        altoDeFoto: 160,
        relleno: '20px',
        rellenoDeFoto: '16px',
        tamanoDeTitulo: '16px',
        verProductoVisible: true,
        estrellasVisibles: 5,
      });
    });

    test(`la grilla del ${nombre} separa las tarjetas 12 px en móvil y 20 px desde 640 px`, async ({ page }) => {
      await page.goto(ruta);
      const separacion = () =>
        page.locator(tarjeta).first().evaluate((enlace) => {
          let grilla = enlace.parentElement!;
          while (getComputedStyle(grilla).display !== 'grid') grilla = grilla.parentElement!;
          return getComputedStyle(grilla).columnGap;
        });
      await movil(page);
      expect(await separacion()).toBe('12px');
      await escritorio(page);
      expect(await separacion()).toBe('20px');
    });

    test(`las imágenes del ${nombre} no superan el doble de su ancho mostrado a 320 y 390 px`, async ({ page, isMobile }) => {
      test.skip(Boolean(isMobile), 'la densidad de píxeles del emulador móvil hace elegir candidatas de otro ancho');
      for (const ancho of [320, 390]) {
        await movil(page, ancho);
        await page.goto(ruta);
        await page.waitForLoadState('networkidle');
        const medidas = await medirCandidatas(page, `${tarjeta} img`);
        expect(medidas.length).toBeGreaterThanOrEqual(2);
        expect(medidas.filter((medida) => !(medida.elegido <= 2 * medida.mostrado)), `${ancho}px`).toEqual([]);
      }
    });
  }
});

test.describe('listados: el dato de reseñas sale una sola vez en el HTML', () => {
  test.use({ javaScriptEnabled: false });

  for (const [nombre, { ruta, tarjeta }] of Object.entries(listados)) {
    test(`la tarjeta del ${nombre} emite la cantidad y el nombre accesible de la calificación una vez`, async ({ page }) => {
      await page.goto(ruta);
      const textos = await page.locator(tarjeta).evaluateAll((tarjetas) =>
        tarjetas.map((nodo) => nodo.textContent!).filter((texto) => /\(\d+\)/.test(texto)),
      );
      expect(textos.length).toBeGreaterThan(0);
      for (const texto of textos) {
        expect(texto.match(/\(\d+\)/g)).toHaveLength(1);
        expect(texto.match(/de 5 estrellas/g)).toHaveLength(1);
      }
    });
  }
});

test.describe('home: primera pantalla y categorías en móvil', () => {
  test('el hero mide 853 px o menos a 390 px, con los CTAs al mismo alto y la constelación a 2/3', async ({ page }) => {
    await movil(page);
    await page.goto('/');
    const medida = await page.evaluate(() => {
      const hero = document.querySelector('main > section:first-of-type')!;
      const enlaces = [...hero.querySelectorAll('a')].map((enlace) => enlace.getBoundingClientRect());
      const baldosas = [...document.querySelectorAll('[data-testid="constelacion-baldosa"]')].map((nodo) => (nodo as HTMLElement).offsetWidth);
      return { alto: Math.round(hero.getBoundingClientRect().height), enlaces, baldosas, ancho: hero.getBoundingClientRect().width };
    });
    expect(medida.alto).toBeLessThanOrEqual(853);
    expect(medida.enlaces).toHaveLength(2);
    expect(Math.round(medida.enlaces[0].height)).toBe(Math.round(medida.enlaces[1].height));
    expect(Math.round(medida.enlaces[0].width)).toBe(Math.round(medida.enlaces[1].width));
    expect(medida.enlaces[0].width).toBeGreaterThan(medida.ancho / 2);
    expect(medida.baldosas).toEqual([64, 64, 64, 64]);
  });

  test('desde 640 px los CTAs vuelven a su ancho natural y la constelación a su tamaño', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto('/');
    const medida = await page.evaluate(() => ({
      enlaces: [...document.querySelectorAll('main > section:first-of-type a')].map((enlace) => enlace.getBoundingClientRect().width),
      baldosa: (document.querySelector('[data-testid="constelacion-baldosa"]') as HTMLElement).offsetWidth,
    }));
    expect(medida.enlaces.every((ancho) => ancho < 350)).toBe(true);
    expect(medida.baldosa).toBe(96);
    await escritorio(page);
    expect(await page.evaluate(() => (document.querySelector('[data-testid="constelacion-baldosa"]') as HTMLElement).offsetWidth)).toBe(112);
  });

  test('las tres categorías caben en una pantalla de 390×844, con la foto de 104 px a la izquierda', async ({ page }) => {
    await movil(page);
    await page.goto('/');
    const medida = await page.locator('#categorias a[href^="/categorias/"]').evaluateAll((tarjetas) => ({
      arriba: tarjetas[0].getBoundingClientRect().top + scrollY,
      abajo: tarjetas.at(-1)!.getBoundingClientRect().bottom + scrollY,
      filas: tarjetas.map((tarjeta) => {
        const imagen = tarjeta.querySelector('img')!.getBoundingClientRect();
        const marco = tarjeta.querySelector('img')!.parentElement!;
        const cuerpo = marco.nextElementSibling!.getBoundingClientRect();
        return { ladoAlLado: imagen.right <= cuerpo.left && Math.abs(imagen.top - cuerpo.top) < tarjeta.getBoundingClientRect().height, marco: marco.getBoundingClientRect().width, borde: getComputedStyle(marco).borderRightWidth };
      }),
    }));
    expect(medida.abajo - medida.arriba).toBeLessThanOrEqual(844);
    expect(medida.filas).toHaveLength(site.categorias.length);
    for (const fila of medida.filas) expect(fila).toEqual({ ladoAlLado: true, marco: 104, borde: '1px' });
  });

  test('las fotos de las categorías no superan el doble de su ancho mostrado a 320 y 390 px', async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), 'la densidad de píxeles del emulador móvil hace elegir candidatas de otro ancho');
    for (const ancho of [320, 390]) {
      await movil(page, ancho);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const medidas = await medirCandidatas(page, '#categorias a[href^="/categorias/"] img');
      expect(medidas).toHaveLength(site.categorias.length);
      expect(medidas.filter((medida) => !(medida.elegido <= 2 * medida.mostrado)), `${ancho}px`).toEqual([]);
    }
  });

  test('desde 640 px la tarjeta de categoría vuelve a la foto arriba', async ({ page }) => {
    await escritorio(page);
    await page.goto('/');
    const apilada = await page.locator('#categorias a[href^="/categorias/"]').first().evaluate((tarjeta) => {
      const imagen = tarjeta.querySelector('img')!.getBoundingClientRect();
      const cuerpo = tarjeta.querySelector('img')!.parentElement!.nextElementSibling!.getBoundingClientRect();
      return imagen.bottom <= cuerpo.top;
    });
    expect(apilada).toBe(true);
  });
});

test.describe('home: carril de reseñas', () => {
  const lista = (page: Page) => page.locator('section[aria-labelledby="resenas-titulo"] ul');

  test('bajo 640 px cada reseña mide el 84 % del carril, la siguiente asoma y la barra va en primario-claro', async ({ page }) => {
    await movil(page);
    await page.goto('/');
    const medida = await lista(page).evaluate((ul) => {
      const caja = ul.getBoundingClientRect();
      const items = [...ul.children].map((item) => item.getBoundingClientRect());
      const estilo = getComputedStyle(ul);
      return {
        proporcion: items[0].width / caja.width,
        segundaAsoma: items[1].left < caja.right,
        segundaCortada: items[1].right > caja.right,
        colorDeBarra: estilo.scrollbarColor,
        encaje: getComputedStyle(ul.children[0]).scrollSnapAlign,
        sinReducir: getComputedStyle(ul.children[0]).flexShrink,
      };
    });
    expect(medida.proporcion).toBeGreaterThan(0.83);
    expect(medida.proporcion).toBeLessThan(0.85);
    expect(medida.segundaAsoma && medida.segundaCortada).toBe(true);
    expect(medida.colorDeBarra).toContain('rgb(220, 230, 237)');
    expect(medida.encaje).toContain('start');
    expect(medida.sinReducir).toBe('0');
  });

  for (const [ancho, porFila] of [[640, 2], [1280, 4]] as const) {
    test(`desde 640 px la grilla vuelve, sin desborde y con la última fila centrada a ${ancho} px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto('/');
      const medida = await lista(page).evaluate((ul) => {
        const caja = ul.getBoundingClientRect();
        const items = [...ul.children].map((item) => item.getBoundingClientRect());
        const filas = new Map<number, DOMRect[]>();
        for (const item of items) filas.set(Math.round(item.top), [...(filas.get(Math.round(item.top)) ?? []), item]);
        const holguras = [...filas.values()].map((fila) => ({
          izquierda: fila[0].left - caja.left,
          derecha: caja.right - fila.at(-1)!.right,
          cantidad: fila.length,
        }));
        return { holguras, desborde: getComputedStyle(ul).overflowX, scroll: ul.scrollWidth > ul.clientWidth };
      });
      expect(medida.desborde).toBe('visible');
      expect(medida.scroll).toBe(false);
      expect(medida.holguras.length).toBeGreaterThan(1);
      expect(medida.holguras[0].cantidad, `${ancho}px`).toBe(porFila);
      expect(medida.holguras.at(-1)!.cantidad).toBeLessThan(medida.holguras[0].cantidad);
      for (const holgura of medida.holguras) expect(Math.abs(holgura.izquierda - holgura.derecha)).toBeLessThanOrEqual(2);
      expect(medida.holguras.reduce((total, holgura) => total + holgura.cantidad, 0)).toBe(resenas.destacadas.length);
    });
  }
});
