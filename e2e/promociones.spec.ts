import { test, expect } from '@playwright/test';
import promociones from '../src/data/promociones.json' with { type: 'json' };
import site from '../src/data/site.json' with { type: 'json' };

type EstadoPromocion = 'vigente' | 'proxima' | 'expirada';

function hoyEnChile(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

function clasificar(promo: { desde: string; hasta: string }, hoy: string): EstadoPromocion {
  if (hoy < promo.desde) return 'proxima';
  if (hoy > promo.hasta) return 'expirada';
  return 'vigente';
}

const hoy = hoyEnChile();

const cuponesClasificados = promociones.cupones.map((cupon) => ({ ...cupon, estado: clasificar(cupon, hoy) }));
const campanasClasificadas = promociones.campanas.map((campana) => ({ ...campana, estado: clasificar(campana, hoy) }));

const cuponesPublicables = cuponesClasificados.filter((cupon) => cupon.estado !== 'expirada');
const campanasPublicables = campanasClasificadas.filter((campana) => campana.estado !== 'expirada');

const cuponesExpirados = cuponesClasificados.filter((cupon) => cupon.estado === 'expirada');
const campanasExpiradas = campanasClasificadas.filter((campana) => campana.estado === 'expirada');
const promosExpiradas = [...cuponesExpirados, ...campanasExpiradas];

const totalPublicables = cuponesPublicables.length + campanasPublicables.length;
const cuponPublicable = cuponesPublicables[0];

async function extraerJsonLd(page: import('@playwright/test').Page) {
  const bloques = await page.locator('script[type="application/ld+json"]').allTextContents();
  return bloques.map((bloque) => JSON.parse(bloque));
}

test.describe('promociones', () => {
  for (const cupon of cuponesPublicables) {
    test(`el cupón "${cupon.nombre}" aparece visible con su estado correcto`, async ({ page }) => {
      await page.goto('/promociones/');
      const tarjeta = page.locator('#cupones [data-promo]', { hasText: cupon.nombre });
      await expect(tarjeta).toBeVisible();
      const textoEsperado = cupon.estado === 'proxima' ? 'Próximamente' : 'Vigente';
      await expect(tarjeta.getByText(textoEsperado, { exact: true })).toBeVisible();
    });
  }

  for (const campana of campanasPublicables) {
    test(`la campaña "${campana.nombre}" aparece visible con su estado correcto`, async ({ page }) => {
      await page.goto('/promociones/');
      const tarjeta = page.locator('#campanas [data-promo]', { hasText: campana.nombre });
      await expect(tarjeta).toBeVisible();
      const textoEsperado = campana.estado === 'proxima' ? 'Próximamente' : 'Vigente';
      await expect(tarjeta.getByText(textoEsperado, { exact: true })).toBeVisible();
    });
  }

  test('ninguna promo expirada aparece en la página', async ({ page }) => {
    if (promosExpiradas.length === 0) {
      test.skip(true, 'no hay promos expiradas en promociones.json a la fecha de build');
      return;
    }
    await page.goto('/promociones/');
    for (const promo of promosExpiradas) {
      await expect(page.locator('[data-promo]', { hasText: promo.nombre })).toHaveCount(0);
    }
  });

  test('el conteo total de tarjetas coincide con las promos publicables', async ({ page }) => {
    await page.goto('/promociones/');
    await expect(page.locator('[data-promo]')).toHaveCount(totalPublicables);
  });

  test('cuando no hay promos publicables se muestra el fallback y no hay secciones', async ({ page }) => {
    if (totalPublicables !== 0) {
      test.skip(true, 'hay promos publicables en promociones.json a la fecha de build');
      return;
    }
    await page.goto('/promociones/');
    await expect(page.locator('#promo-fallback')).toBeVisible();
    await expect(page.locator('#cupones')).toHaveCount(0);
    await expect(page.locator('#campanas')).toHaveCount(0);
  });

  test('cuando hay promos publicables no existe el fallback en el DOM', async ({ page }) => {
    if (totalPublicables === 0) {
      test.skip(true, 'no hay promos publicables en promociones.json a la fecha de build');
      return;
    }
    await page.goto('/promociones/');
    await expect(page.locator('#promo-fallback')).toHaveCount(0);
  });

  test('los cupones muestran su porcentaje y enlazan a la página oficial de Mercado Libre', async ({ page }) => {
    if (!cuponPublicable) {
      test.skip(true, 'no hay cupón publicable en promociones.json a la fecha de build');
      return;
    }
    await page.goto('/promociones/');
    const tarjeta = page.locator('#cupones [data-promo]', { hasText: cuponPublicable.nombre });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.getByText(`${cuponPublicable.porcentaje}%`, { exact: true })).toBeVisible();
    const href = await tarjeta.locator('a').getAttribute('href');
    expect(href).toBe(site.mercadolibre.paginaOficial);
  });

  test('la aclaración de compra en Mercado Libre está visible', async ({ page }) => {
    await page.goto('/promociones/');
    await expect(page.getByText(promociones.aclaracion)).toBeVisible();
  });

  test('hay exactamente un h1', async ({ page }) => {
    await page.goto('/promociones/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('hay un SaleEvent por cada campaña publicable, con las fechas del JSON', async ({ page }) => {
    if (campanasPublicables.length === 0) {
      test.skip(true, 'no hay campañas publicables en promociones.json a la fecha de build');
      return;
    }
    await page.goto('/promociones/');
    const bloquesJsonLd = await extraerJsonLd(page);
    const saleEvents = bloquesJsonLd.filter((entrada) => entrada['@type'] === 'SaleEvent');
    expect(saleEvents.length).toBe(campanasPublicables.length);
    for (const saleEvent of saleEvents) {
      const campanaCorrespondiente = campanasPublicables.find(
        (campana) => campana.desde === saleEvent.startDate && campana.hasta === saleEvent.endDate,
      );
      expect(campanaCorrespondiente).toBeDefined();
    }
  });
});
