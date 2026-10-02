import type { Page } from '@playwright/test';
import { muestras } from '../_muestras';
import { abrir, eventos, eventosTras, expect, test } from './_ga4';

const buscador = (page: Page) => page.getByRole('searchbox');

const abrirCatalogo = async (page: Page) => {
  await page.clock.install();
  await abrir(page, '/productos/');
  await expect(buscador(page)).toBeVisible();
};

const escribir = async (page: Page, consulta: string, esperaMs = 1600) => {
  await buscador(page).fill(consulta);
  await page.clock.runFor(esperaMs);
};

const terminosEmitidos = async (page: Page) =>
  (await eventos(page)).filter((evento) => evento.nombre === 'busqueda').map((evento) => evento.parametros.termino);

const consultaSinResultados = 'zzzzzzzzzzzz';
const palabraDeUnTitulo = String(muestras.fichas[0].titulo)
  .toLowerCase()
  .split(/[^a-záéíóúñ]+/)
  .find((palabra) => palabra.length >= 5)!;

test.describe('[analitica] Búsqueda con espera y sin repetición', () => {
  test('Escritura continua', async ({ page }) => {
    await abrirCatalogo(page);
    await buscador(page).fill('fun');
    await page.clock.runFor(1000);
    expect(await terminosEmitidos(page)).toEqual([]);
    await buscador(page).fill('funda');
    await page.clock.runFor(1400);
    expect(await terminosEmitidos(page)).toEqual([]);
    await page.clock.runFor(200);
    expect(await terminosEmitidos(page)).toEqual(['funda']);
    await page.clock.runFor(5000);
    expect(await terminosEmitidos(page)).toEqual(['funda']);
  });

  test('Mismo término normalizado', async ({ page }) => {
    await abrirCatalogo(page);
    await escribir(page, 'Funda');
    await escribir(page, 'funda ');
    await escribir(page, '  FÚNDA');
    expect(await terminosEmitidos(page)).toEqual(['funda']);
  });

  test('Término que vuelve', async ({ page }) => {
    await abrirCatalogo(page);
    await escribir(page, 'Funda');
    await escribir(page, 'otro');
    await escribir(page, 'funda');
    expect(await terminosEmitidos(page)).toEqual(['funda', 'otro', 'funda']);
  });

  test('Sin resultados', async ({ page }) => {
    await abrirCatalogo(page);
    const emitidos = await eventosTras(page, () => escribir(page, consultaSinResultados));
    expect(emitidos).toHaveLength(1);
    expect(emitidos[0].parametros).toEqual({ termino: consultaSinResultados, resultados: 0, pagina: '/productos/' });
  });

  test('Resultados del término emitido', async ({ page }) => {
    await abrirCatalogo(page);
    const emitidos = await eventosTras(page, () => escribir(page, palabraDeUnTitulo));
    const listados = await page.locator('main li a[href^="/productos/"]').count();
    expect(listados).toBeGreaterThan(0);
    expect(emitidos).toHaveLength(1);
    expect(emitidos[0].parametros.resultados).toBe(listados);
  });

  test('Normalización del término', async ({ page }) => {
    await abrirCatalogo(page);
    await escribir(page, '  FÚNDA   Rojá ');
    expect(await terminosEmitidos(page)).toEqual(['funda roja']);
  });

  test('Término vacío o solo espacios', async ({ page }) => {
    await abrirCatalogo(page);
    await escribir(page, 'funda');
    await escribir(page, '');
    await escribir(page, '   ');
    expect(await terminosEmitidos(page)).toEqual(['funda']);
  });

  test('Sin gtag no emite', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (error) => errores.push(error.message));
    await abrirCatalogo(page);
    await page.evaluate(() => {
      (window as unknown as { gtag?: unknown }).gtag = undefined;
    });
    await escribir(page, 'funda');
    expect(await terminosEmitidos(page)).toEqual([]);
    expect(errores).toEqual([]);
    await page.evaluate(() => {
      (window as unknown as { gtag: (...argumentos: unknown[]) => void }).gtag = function () {
        (window as unknown as { dataLayer: unknown[] }).dataLayer.push(arguments);
      };
    });
    await escribir(page, 'FÚNDA');
    expect(await terminosEmitidos(page)).toEqual(['funda']);
  });
});
