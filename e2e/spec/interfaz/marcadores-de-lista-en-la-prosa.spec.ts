import { expect, test, type Page } from '@playwright/test';
import { muestras } from '../_muestras';

const ACENTO_OSCURO = 'rgb(138, 69, 23)';
const rutasDeProsa = [...muestras.guias.map((guia) => `/guias/${guia.slug}/`), '/contacto/', '/terminos-y-condiciones/'];

const estiloDeItems = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((items) =>
    items.map((item) => ({
      tipo: getComputedStyle(item).listStyleType,
      marcador: getComputedStyle(item, '::marker').color,
    })),
  );

const revisar = async (page: Page, selector: string, tipo: string) => {
  let revisados = 0;
  for (const ruta of rutasDeProsa) {
    await page.goto(ruta);
    const items = await estiloDeItems(page, selector);
    revisados += items.length;
    expect(items.filter((item) => item.tipo !== tipo || item.marcador !== ACENTO_OSCURO), ruta).toEqual([]);
  }
  expect(revisados).toBeGreaterThan(0);
};

test.describe('[interfaz] Marcadores de lista en la prosa', () => {
  test('Paso a paso numerado', async ({ page }) => {
    await revisar(page, '.contenido-md ol > li', 'decimal');
  });

  test('Lista con viñetas', async ({ page }) => {
    await revisar(page, '.contenido-md:not(.contenido-md-con-check) ul > li', 'disc');
  });

  test('Las listas con check no usan marcador', async ({ page }) => {
    await page.goto('/');
    const items = await estiloDeItems(page, '.contenido-md-con-check ul > li');
    expect(items.length).toBeGreaterThan(0);
    expect(items.filter((item) => item.tipo !== 'none')).toEqual([]);
  });
});
