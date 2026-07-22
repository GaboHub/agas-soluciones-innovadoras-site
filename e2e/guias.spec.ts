import { test, expect } from '@playwright/test';

async function extraerJsonLd(page: import('@playwright/test').Page) {
  const bloques = await page.locator('script[type="application/ld+json"]').allTextContents();
  return bloques.map((bloque) => JSON.parse(bloque));
}

test.describe('guías de compra y uso', () => {
  test('/guias/ lista las 5 guías', async ({ page }) => {
    await page.goto('/guias/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Guías de compra y uso');
    const tarjetas = page.getByRole('main').locator('a[href^="/guias/"]');
    await expect(tarjetas).toHaveCount(5);
  });

  test('una guía renderiza h1, JSON-LD Article y al menos un link a producto relacionado', async ({ page }) => {
    await page.goto('/guias/que-lamina-sirve-para-mi-nintendo-switch/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      '¿Qué lámina de vidrio sirve para mi Nintendo Switch?',
    );

    const bloquesJsonLd = await extraerJsonLd(page);
    const article = bloquesJsonLd.find((entrada) => entrada['@type'] === 'Article');
    expect(article).toBeDefined();
    expect(article.headline).toBe('¿Qué lámina de vidrio sirve para mi Nintendo Switch?');
    expect(article.inLanguage).toBe('es-CL');
    expect(article.mainEntityOfPage).toBe(
      'https://agassoluciones.cl/guias/que-lamina-sirve-para-mi-nintendo-switch/',
    );

    const linkProducto = page.locator('a[href="/productos/lamina-vidrio-nintendo-switch/"]');
    expect(await linkProducto.count()).toBeGreaterThanOrEqual(1);
  });

  test('la ficha de un producto relacionado muestra "Guías que te pueden servir" con link de vuelta', async ({
    page,
  }) => {
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    await expect(page.getByRole('heading', { level: 2, name: 'Guías que te pueden servir' })).toBeVisible();
    await expect(
      page.locator('a[href="/guias/que-lamina-sirve-para-mi-nintendo-switch/"]'),
    ).toBeVisible();
  });

  test('el badge de despacho el mismo día es visible en una ficha', async ({ page }) => {
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    await expect(page.getByText('Despacho el mismo día vía Mercado Envíos')).toBeVisible();
  });

  test('la meta description de una ficha coincide con la metaDescription del override', async ({ page }) => {
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBe(
      'Lámina de vidrio templado 9H para Nintendo Switch 1 (pantalla 6.2"). Instalación sin burbujas y despacho el mismo día por Mercado Libre.',
    );
  });
});
