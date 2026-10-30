import { expect, test, type Page } from '@playwright/test';
import site from '../../../src/data/site.json' with { type: 'json' };
import { rotuloPrecio } from '../../../src/lib/formato';
import { esperarHidratacion } from '../_hidratacion';
import { muestras, paginasDeMuestra } from '../_muestras';
import { elegir, enlaceDelCta, fichasConOpciones } from '../_selector';

const esFicha = (ruta: string) => /^\/productos\/[^/]+\/$/.test(ruta);
const fueraDeFicha = paginasDeMuestra.filter((ruta) => !esFicha(ruta));
const rutaDe = (slug: string) => `/productos/${slug}/`;
const datosDe = (slug: string) => fichasConOpciones.find(({ ficha }) => ficha.slug === slug)!;
const fichasDeMuestra = [muestras.fichaSimple.slug, muestras.fichaConGrupos.slug];
const conBotones = fichasConOpciones.find(
  ({ gruposFicha }) =>
    gruposFicha.length === 1 && gruposFicha[0].opciones.length > 1 && gruposFicha[0].opciones.length <= 10,
)!;

const burbujaDe = (page: Page) => page.locator('#burbuja-mercadolibre');
const barraDe = (page: Page) => page.locator('#barra-compra');
const precioDeLaBarra = (page: Page) => page.locator('#barra-compra-precio');

test.describe('[sitio] Burbuja de Mercado Libre', () => {
  test('Fuera de una ficha', async ({ page }) => {
    await page.goto('/');
    const burbuja = page.locator('#burbuja-mercadolibre');
    await expect(burbuja).toHaveAttribute('href', site.mercadolibre.tienda);
    await expect(burbuja).toHaveAttribute('target', '_blank');
    await expect(burbuja).toHaveAttribute('rel', 'noopener');
    await expect(page.getByRole('link', { name: site.ctaHeader, exact: true }).and(burbuja)).toBeVisible();
  });

  test('Ficha con opción cambiada', async ({ page }) => {
    const { ficha, gruposFicha, etiquetaOpcion } = conBotones;
    const opciones = gruposFicha[0].opciones;
    const precioUnico = '$98.765';
    expect(opciones.map(({ precioTexto }) => precioTexto)).not.toContain(precioUnico);
    let sustituciones = 0;
    await page.route(`**${rutaDe(ficha.slug)}`, async (route) => {
      const respuesta = await route.fetch();
      const marca = '&quot;precioTexto&quot;:[0,&quot;';
      const partes = (await respuesta.text()).split(marca);
      sustituciones = partes.length - 1;
      const fin = partes[2].indexOf('&quot;');
      partes[2] = `${precioUnico}${partes[2].slice(fin)}`;
      await route.fulfill({ response: respuesta, body: partes.join(marca) });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(rutaDe(ficha.slug));
    await esperarHidratacion(page);
    expect(sustituciones).toBeGreaterThanOrEqual(opciones.length);
    const burbuja = burbujaDe(page);
    await expect(burbuja).toHaveAttribute('href', opciones[0].link);
    await expect(precioDeLaBarra(page)).toHaveText(opciones[0].precioTexto);
    await expect(page.getByRole('link', { name: site.ctaFicha, exact: true }).and(burbuja)).toBeVisible();

    const segunda = page.getByRole('button', { name: opciones[1].nombre, exact: true });
    await expect(segunda).toHaveAttribute('aria-pressed', 'false');
    await elegir(page, etiquetaOpcion, 1);
    await expect(segunda).toHaveAttribute('aria-pressed', 'true');
    const cta = await enlaceDelCta(page);
    expect(cta).toBe(opciones[1].link);
    await expect(burbuja).toHaveAttribute('href', cta!);
    await expect(precioDeLaBarra(page)).toHaveText(precioUnico);

    const primera = page.getByRole('button', { name: opciones[0].nombre, exact: true });
    await expect(primera).toHaveAttribute('aria-pressed', 'false');
    await elegir(page, etiquetaOpcion, 0);
    await expect(burbuja).toHaveAttribute('href', opciones[0].link);
    await expect(precioDeLaBarra(page)).toHaveText(opciones[0].precioTexto);
  });

  test('Móvil', async ({ page }) => {
    const ancho = 390;
    const alto = 844;
    await page.setViewportSize({ width: ancho, height: alto });
    expect(fueraDeFicha.length).toBeGreaterThan(3);
    for (const ruta of fueraDeFicha) {
      await page.goto(ruta);
      const burbuja = page.locator('#burbuja-mercadolibre');
      await expect(burbuja, ruta).toBeVisible();
      const caja = (await burbuja.boundingBox())!;
      expect(caja.x, ruta).toBeGreaterThanOrEqual(ancho / 2);
      expect(caja.y, ruta).toBeGreaterThanOrEqual(alto / 2);
      expect(caja.x + caja.width, ruta).toBeLessThanOrEqual(ancho);
      expect(caja.y + caja.height, ruta).toBeLessThanOrEqual(alto);
      await expect(barraDe(page), ruta).toHaveCount(0);
      await expect(burbuja, ruta).toHaveAttribute('aria-label', site.ctaHeader);
    }
  });

  test('Barra de compra', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const slug of fichasDeMuestra) {
      const { ficha, gruposFicha } = datosDe(slug);
      await page.goto(rutaDe(slug));
      const barra = barraDe(page);
      const burbuja = burbujaDe(page);
      await expect(barra, slug).toBeVisible();
      expect(await page.evaluate(() => window.scrollY), slug).toBe(0);
      expect(await barra.evaluate((nodo) => getComputedStyle(nodo).position), slug).toBe('fixed');
      expect(await barra.evaluate((nodo) => getComputedStyle(nodo).boxShadow), slug).toMatch(/0px -[1-9]\d*px [1-9]\d*px/);
      const caja = (await barra.boundingBox())!;
      expect([caja.x, caja.width, caja.y + caja.height], slug).toEqual([0, 390, 844]);

      await expect(precioDeLaBarra(page), slug).toBeVisible();
      await expect(precioDeLaBarra(page), slug).toHaveText(gruposFicha[0].opciones[0].precioTexto);
      await expect(barra.getByText(rotuloPrecio(ficha.fechaPrecio), { exact: true }), slug).toBeVisible();

      await expect(barra.getByRole('link', { name: site.ctaFicha, exact: true }), slug).toBeVisible();
      await expect(barra.locator('#burbuja-mercadolibre'), slug).toHaveCount(1);
      await expect(burbuja.getByText(site.ctaFicha, { exact: true }), slug).toBeVisible();
      await expect(burbuja, slug).not.toHaveAttribute('aria-label');
      await expect(burbuja, slug).toHaveAttribute('href', gruposFicha[0].opciones[0].link);

      const enlace = (await burbuja.boundingBox())!;
      const circulo = (await burbuja.locator('[data-ilustracion]').boundingBox())!;
      expect([circulo.width, circulo.height], slug).toEqual([56, 56]);
      expect(enlace.width, slug).toBeGreaterThan(circulo.width + 40);
      expect(enlace.x + enlace.width, slug).toBeLessThanOrEqual(390);
      expect(circulo.x + circulo.width, slug).toBeCloseTo(enlace.x + enlace.width, 0);
    }
  });

  test('Precio y fecha en el HTML del build', async ({ browser, baseURL }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await contexto.newPage();
    for (const slug of fichasDeMuestra) {
      const { ficha, gruposFicha } = datosDe(slug);
      await page.goto(rutaDe(slug));
      const barra = barraDe(page);
      await expect(precioDeLaBarra(page), slug).toHaveText(gruposFicha[0].opciones[0].precioTexto);
      await expect(barra, slug).toContainText(rotuloPrecio(ficha.fechaPrecio));
      await expect(barra.locator('#burbuja-mercadolibre'), slug).toHaveAttribute('href', gruposFicha[0].opciones[0].link);
    }
    await contexto.close();
  });

  test('Pantalla angosta', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const slug of fichasDeMuestra) {
      const { ficha } = datosDe(slug);
      await page.goto(rutaDe(slug));
      const barra = barraDe(page);
      await expect(barra, slug).toBeVisible();
      await expect(barra.getByRole('link', { name: site.ctaFicha, exact: true }), slug).toBeVisible();
      await expect(precioDeLaBarra(page), slug).toBeHidden();
      await expect(barra.getByText(rotuloPrecio(ficha.fechaPrecio), { exact: true }), slug).toBeHidden();
      const enlace = (await burbujaDe(page).boundingBox())!;
      expect(enlace.x, slug).toBeGreaterThanOrEqual(0);
      expect(enlace.x + enlace.width, slug).toBeLessThanOrEqual(320);
    }
  });

  test('Límite de 360 px', async ({ page }) => {
    const slug = muestras.fichaSimple.slug;
    await page.setViewportSize({ width: 359, height: 800 });
    await page.goto(rutaDe(slug));
    await expect(precioDeLaBarra(page)).toBeHidden();
    await page.setViewportSize({ width: 360, height: 800 });
    await expect(precioDeLaBarra(page)).toBeVisible();
    const precio = (await precioDeLaBarra(page).boundingBox())!;
    const enlace = (await burbujaDe(page).boundingBox())!;
    expect(precio.x + precio.width).toBeLessThanOrEqual(enlace.x);
  });

  test('Desde 768 px vuelve el círculo', async ({ page }) => {
    const slug = muestras.fichaSimple.slug;
    await page.setViewportSize({ width: 767, height: 900 });
    await page.goto(rutaDe(slug));
    await expect(barraDe(page)).toBeVisible();
    await page.setViewportSize({ width: 768, height: 900 });
    const burbuja = burbujaDe(page);
    await expect(precioDeLaBarra(page)).toBeHidden();
    const caja = (await burbuja.boundingBox())!;
    expect([caja.width, caja.height]).toEqual([56, 56]);
    expect(caja.x + caja.width).toBeCloseTo(768 - 20, 0);
    expect(caja.y + caja.height).toBeCloseTo(900 - 20, 0);
    expect(await barraDe(page).evaluate((nodo) => getComputedStyle(nodo).display)).toBe('contents');
    await expect(page.getByRole('link', { name: site.ctaFicha, exact: true }).and(burbuja)).toBeVisible();
    await expect(burbuja).not.toHaveAttribute('aria-label');
    const textoAGranel = await burbuja.getByText(site.ctaFicha, { exact: true }).boundingBox();
    expect(textoAGranel === null || textoAGranel.width <= 1).toBe(true);
  });

  test('Toda página muestra la burbuja con enlace seguro, también en escritorio', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const ruta of [...paginasDeMuestra, `/productos/${muestras.fichaSimple.slug}/`]) {
      await page.goto(ruta);
      const burbuja = page.locator('#burbuja-mercadolibre');
      await expect(burbuja, ruta).toBeVisible();
      await expect(burbuja, ruta).toHaveAttribute('target', '_blank');
      await expect(burbuja, ruta).toHaveAttribute('rel', 'noopener');
    }
  });
});
