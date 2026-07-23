import { test, expect } from '@playwright/test';
import promociones from '../src/data/promociones.json' with { type: 'json' };
import site from '../src/data/site.json' with { type: 'json' };

function hoyEnChile(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(fecha);
}

function sumarDiasIso(fechaIso: string, dias: number): string {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function instanteParaFechaChile(fechaIso: string): Date {
  return new Date(`${fechaIso}T12:00:00-04:00`);
}

const hoyReal = hoyEnChile(new Date());

const cuponPublicable = promociones.cupones.find((cupon) => cupon.hasta >= hoyReal);
const primeraPromoPublicable = [...promociones.cupones, ...promociones.campanas].find(
  (promo) => promo.hasta >= hoyReal,
);

const todasLasFechasHasta = [...promociones.cupones, ...promociones.campanas].map((item) => item.hasta);
const fechaFallback = sumarDiasIso(
  todasLasFechasHasta.reduce((max, actual) => (actual > max ? actual : max), hoyReal),
  1,
);

function maxHastaDe(items: { hasta: string }[]): string {
  return items.reduce((max, item) => (item.hasta > max ? item.hasta : max), '');
}

const gruposPromo = [
  { id: 'cupones', selector: '#cupones', items: promociones.cupones },
  { id: 'campanas', selector: '#campanas', items: promociones.campanas },
] as const;

test.describe('promociones', () => {
  test('antes de que empiece la primera promo publicable, la tarjeta aparece como Próximamente', async ({
    page,
  }) => {
    if (!primeraPromoPublicable) {
      test.skip(true, 'no hay promo publicable en promociones.json a la fecha de build');
      return;
    }
    const fechaAntes = sumarDiasIso(primeraPromoPublicable.desde, -1);
    await page.clock.install({ time: instanteParaFechaChile(fechaAntes) });
    await page.goto('/promociones/');
    const tarjeta = page.locator('[data-promo]', { hasText: primeraPromoPublicable.nombre });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.locator('[data-promo-badge]')).toHaveText('Próximamente');
  });

  test('el día en que empieza la primera promo publicable, la tarjeta aparece como Vigente', async ({ page }) => {
    if (!primeraPromoPublicable) {
      test.skip(true, 'no hay promo publicable en promociones.json a la fecha de build');
      return;
    }
    await page.clock.install({ time: instanteParaFechaChile(primeraPromoPublicable.desde) });
    await page.goto('/promociones/');
    const tarjeta = page.locator('[data-promo]', { hasText: primeraPromoPublicable.nombre });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.locator('[data-promo-badge]')).toHaveText('Vigente');
  });

  test('pasadas todas las ventanas no queda ninguna promo visible y se muestra el fallback', async ({ page }) => {
    await page.clock.install({ time: instanteParaFechaChile(fechaFallback) });
    await page.goto('/promociones/');
    await expect(page.locator('[data-promo]')).toHaveCount(0);
    await expect(page.locator('#cupones')).toBeHidden();
    await expect(page.locator('#campanas')).toBeHidden();
    await expect(page.locator('#promo-fallback')).toBeVisible();
  });

  test('cuando un grupo de promos vence pero el otro sigue vigente, solo la sección vacía se oculta', async ({
    page,
  }) => {
    const [grupoA, grupoB] = gruposPromo;
    const maxHastaA = maxHastaDe(grupoA.items);
    const maxHastaB = maxHastaDe(grupoB.items);

    if (maxHastaA === maxHastaB) {
      test.skip(
        true,
        'los grupos de cupones y campañas vencen el mismo día, no existe un escenario mixto con los datos actuales',
      );
      return;
    }

    const grupoQueVence = maxHastaA < maxHastaB ? grupoA : grupoB;
    const grupoQueSobrevive = maxHastaA < maxHastaB ? grupoB : grupoA;
    const maxHastaQueVence = maxHastaA < maxHastaB ? maxHastaA : maxHastaB;

    if (!grupoQueVence.items.some((item) => item.hasta >= hoyReal)) {
      test.skip(
        true,
        `a la fecha de build ya no hay promos publicables en ${grupoQueVence.id}, su sección no se renderiza y el escenario mixto no aplica`,
      );
      return;
    }

    const fecha = sumarDiasIso(maxHastaQueVence, 1);
    const sobrevivientes = grupoQueSobrevive.items.filter((item) => item.hasta >= fecha);

    if (sobrevivientes.length === 0) {
      test.skip(
        true,
        `a la fecha en que vence ${grupoQueVence.id}, no queda ninguna promo publicable en ${grupoQueSobrevive.id}`,
      );
      return;
    }

    await page.clock.install({ time: instanteParaFechaChile(fecha) });
    await page.goto('/promociones/');

    await expect(page.locator(grupoQueVence.selector)).toBeHidden();
    await expect(page.locator(`${grupoQueVence.selector} [data-promo]`)).toHaveCount(0);

    await expect(page.locator(grupoQueSobrevive.selector)).toBeVisible();
    await expect(page.locator(`${grupoQueSobrevive.selector} [data-promo]`)).toHaveCount(sobrevivientes.length);
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
});
