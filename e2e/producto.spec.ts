import { test, expect } from '@playwright/test';
import { esperarHidratacion } from './hidratacion';
import promociones from '../src/data/promociones.json' with { type: 'json' };

async function extraerJsonLd(page: import('@playwright/test').Page) {
  const bloques = await page.locator('script[type="application/ld+json"]').allTextContents();
  return bloques.map((bloque) => JSON.parse(bloque));
}

function hoyEnChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

const hoy = hoyEnChile();
const hayPromosPublicables = [...promociones.cupones, ...promociones.campanas].some((item) => item.hasta >= hoy);

test.describe('página de producto', () => {
  test('el CTA primario apunta al permalink de Mercado Libre en pestaña nueva', async ({ page }) => {
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    const cta = page.locator('[data-cta="ver-en-mercado-libre"]');
    await expect(cta).toBeVisible();
    await expect(cta).toHaveText(/Ver en Mercado Libre/);
    await expect(cta).toHaveAttribute('href', /^https:\/\/articulo\.mercadolibre\.cl\/MLC-/);
    await expect(cta).toHaveAttribute('target', '_blank');
    await expect(cta).toHaveAttribute('rel', /noopener/);
  });

  test('el CTA secundario lleva a la tienda de Mercado Libre', async ({ page }) => {
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    const cta = page.getByRole('main').getByRole('link', { name: 'Ver tienda en Mercado Libre' });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', /perfil\.mercadolibre\.cl/);
  });

  test('muestra el precio en CLP con la leyenda de precio referencial', async ({ page }) => {
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    await expect(page.getByText(/^\$\d{1,3}(\.\d{3})*$/).first()).toBeVisible();
    await expect(
      page.getByText(/Precio referencial al \d{2}-\d{2}-\d{4} — ver precio vigente en Mercado Libre/),
    ).toBeVisible();
  });

  test('no muestra stock', async ({ page }) => {
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    const cuerpo = (await page.locator('main').textContent()) ?? '';
    expect(cuerpo).not.toMatch(/stock/i);
  });

  test('muestra el bloque de promociones de la tienda', async ({ page }) => {
    if (!hayPromosPublicables) {
      test.skip(true, 'no hay cupones ni campañas publicables en promociones.json a la fecha de build');
      return;
    }
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    const bloque = page.locator('#promociones-resumen');
    await expect(bloque).toBeVisible();
    await expect(bloque.getByText(promociones.aclaracion)).toBeVisible();
    const cta = bloque.locator('[data-cta="ver-promociones"]');
    await expect(cta).toHaveAttribute('href', '/promociones/');
    const cuerpo = (await bloque.textContent()) ?? '';
    expect(cuerpo).not.toMatch(/\$\d{1,3}(\.\d{3})*/);
  });

  test('el layout es de dos columnas: galería a la izquierda y precio/CTA a la derecha', async ({
    page,
    isMobile,
  }) => {
    test.skip(Boolean(isMobile), 'el layout de dos columnas aplica desde md');
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    await esperarHidratacion(page);
    const galeria = page.getByRole('button', { name: /Ampliar foto/ });
    const cta = page.locator('[data-cta="ver-en-mercado-libre"]');
    await expect(galeria).toBeVisible();
    const cajaGaleria = await galeria.boundingBox();
    const cajaCta = await cta.boundingBox();
    const cajaPrecio = await page.getByText(/^\$\d{1,3}(\.\d{3})*$/).first().boundingBox();
    expect(cajaGaleria).not.toBeNull();
    expect(cajaCta!.x).toBeGreaterThan(cajaGaleria!.x + cajaGaleria!.width - 1);
    expect(cajaPrecio!.x).toBeGreaterThan(cajaGaleria!.x + cajaGaleria!.width - 1);
  });

  test('la foto principal de la galería carga con prioridad alta', async ({ page }) => {
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    const principal = page.getByRole('button', { name: /Ampliar foto/ });
    await expect(principal.locator('img')).toHaveAttribute('fetchpriority', 'high');
    const miniaturas = page.getByRole('button', { name: /Ver como foto principal/ });
    await expect(miniaturas.first().locator('img')).not.toHaveAttribute('fetchpriority', 'high');
  });

  test('la galería cambia la foto principal desde las miniaturas', async ({ page }) => {
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    await esperarHidratacion(page);
    const principal = page.getByRole('button', { name: /Ampliar foto/ });
    const srcInicial = await principal.locator('img').getAttribute('src');
    const miniaturas = page.getByRole('button', { name: /Ver como foto principal/ });
    await miniaturas.nth(1).click();
    await expect(miniaturas.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(principal.locator('img')).not.toHaveAttribute('src', srcInicial ?? '');
  });

  test('un producto con variantes permite cambiar la galería por color', async ({ page }) => {
    await page.goto('/productos/set-9en1-nintendo-switch-2/');
    await esperarHidratacion(page);
    await expect(page.getByText('Color:', { exact: false }).first()).toBeVisible();
    const botonCeleste = page.getByRole('button', { name: 'Celeste', exact: true });
    await expect(botonCeleste).toHaveAttribute('aria-pressed', 'false');
    await botonCeleste.click();
    await expect(botonCeleste).toHaveAttribute('aria-pressed', 'true');
  });

  test('el CTA de un producto con variantes apunta al deep-link de la variante activa', async ({ page }) => {
    await page.goto('/productos/set-9en1-nintendo-switch-2/');
    await esperarHidratacion(page);
    const cta = page.locator('[data-cta="ver-en-mercado-libre"]');
    await expect(cta).toHaveAttribute('href', /\?variation=\d+$/);
    const hrefInicial = await cta.getAttribute('href');
    await page.getByRole('button', { name: 'Celeste', exact: true }).click();
    await expect(cta).not.toHaveAttribute('href', hrefInicial ?? '');
    await expect(cta).toHaveAttribute('href', /\?variation=\d+$/);
  });

  test('un producto con muchas variantes usa un select en vez de píldoras', async ({ page }) => {
    await page.goto('/productos/kit-funda-silicona-grips-control-ps5/');
    await esperarHidratacion(page);
    const select = page.getByLabel(/Color/);
    await expect(select).toBeVisible();
    const nombresDeOpciones = await select.locator('option').allTextContents();
    expect(nombresDeOpciones.length).toBeGreaterThan(10);
    for (const nombre of nombresDeOpciones.slice(0, 3)) {
      expect(await page.getByRole('button', { name: nombre, exact: true }).count()).toBe(0);
    }

    const cta = page.locator('[data-cta="ver-en-mercado-libre"]');
    const hrefInicial = await cta.getAttribute('href');
    await expect(cta).toHaveAttribute('href', /\?variation=\d+$/);
    await select.selectOption('1');
    await expect(cta).not.toHaveAttribute('href', hrefInicial ?? '');
    await expect(cta).toHaveAttribute('href', /\?variation=\d+$/);
  });

  test('una familia con miembros cambia el link de compra según la opción', async ({ page }) => {
    await page.goto('/productos/cargador-dual-controles-ps5/');
    await esperarHidratacion(page);
    const cta = page.locator('[data-cta="ver-en-mercado-libre"]');
    const hrefInicial = await cta.getAttribute('href');
    await page.getByRole('button', { name: 'Blanco', exact: true }).click();
    await expect(cta).not.toHaveAttribute('href', hrefInicial ?? '');
    await expect(cta).toHaveAttribute('href', /^https:\/\/articulo\.mercadolibre\.cl\/MLC-/);
  });

  test('la ficha emite un JSON-LD BreadcrumbList que coincide con la miga visible', async ({ page }) => {
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    const nav = page.locator('nav[aria-label="Ruta de navegación"]');
    const textosVisibles = (await nav.locator('li').allTextContents()).filter((texto) => texto !== '›');

    const bloquesJsonLd = await extraerJsonLd(page);
    const breadcrumb = bloquesJsonLd.find((entrada) => entrada['@type'] === 'BreadcrumbList');
    expect(breadcrumb).toBeDefined();
    expect(breadcrumb.itemListElement).toHaveLength(textosVisibles.length);

    breadcrumb.itemListElement.forEach(
      (entrada: { '@type': string; position: number; name: string; item?: string }, indice: number) => {
        expect(entrada['@type']).toBe('ListItem');
        expect(entrada.position).toBe(indice + 1);
        expect(entrada.name).toBe(textosVisibles[indice]);
      },
    );

    expect(breadcrumb.itemListElement[0].item).toBe('https://agassoluciones.cl/');
    expect(breadcrumb.itemListElement[breadcrumb.itemListElement.length - 1].item).toBeUndefined();
  });
});
