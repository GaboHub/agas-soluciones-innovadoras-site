import { expect, test } from '@playwright/test';
import faqs from '../../../src/data/faqs.json' with { type: 'json' };
import resenas from '../../../src/data/resenas.json' with { type: 'json' };
import site from '../../../src/data/site.json' with { type: 'json' };
import { muestras } from '../_muestras';

const normalizar = (texto: string) => texto.replace(/\s+/g, ' ').trim();

test.describe('[sitio] Home', () => {
  test('Estructura', async ({ page }) => {
    await page.goto('/');
    const titulos = page.getByRole('heading', { level: 1 });
    await expect(titulos).toHaveCount(1);
    expect(normalizar((await titulos.textContent()) ?? '')).toBe(site.hero.titulo);
    await expect(titulos.getByText(site.hero.acentuada, { exact: true })).toBeVisible();
    const tarjetas = await page
      .locator('main a[href^="/categorias/"]')
      .evaluateAll((enlaces) => enlaces.map((enlace) => enlace.getAttribute('href')));
    expect(tarjetas).toEqual(site.categorias.map((categoria) => `/categorias/${categoria.slug}/`));
    for (const categoria of site.categorias) {
      const tarjeta = page.locator(`main a[href="/categorias/${categoria.slug}/"]`);
      await expect(tarjeta.getByText(categoria.nombre, { exact: true })).toBeVisible();
      await expect(tarjeta.locator('svg').first()).toBeVisible();
    }
    for (const sello of site.sellosConfianza) await expect(page.getByText(sello, { exact: true })).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: site.ctaHeader }).first()).toHaveAttribute('href', site.mercadolibre.tienda);
    for (const faq of faqs.global.slice(0, 3)) await expect(page.getByText(faq.pregunta, { exact: true })).toBeVisible();
  });

  test('Más reseñadas', async ({ page }) => {
    const conResenas = muestras.fichas
      .filter((ficha) => (ficha.reviews?.cantidad ?? 0) > 0)
      .sort((a, b) => b.reviews.cantidad - a.reviews.cantidad);
    expect(conResenas.length).toBeGreaterThan(4);
    expect(conResenas[3].reviews.cantidad).toBeGreaterThan(conResenas[4].reviews.cantidad);
    await page.goto('/');
    const tarjetas = (
      await page.locator('main a[href^="/productos/"]').evaluateAll((enlaces) =>
        enlaces.filter((enlace) => !enlace.closest('figure')).map((enlace) => enlace.getAttribute('href')!),
      )
    ).filter((href) => href !== '/productos/');
    expect(tarjetas).toEqual(conResenas.slice(0, 4).map((ficha) => `/productos/${ficha.slug}/`));
  });

  test('Reseñas destacadas', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByText(`${resenas.promedioGeneral.toFixed(1)} de 5 estrellas con ${resenas.totalReviews} reseñas`),
    ).toBeVisible();
    expect(resenas.destacadas.length).toBeGreaterThan(0);
    for (const destacada of resenas.destacadas) {
      const reseña = page.locator('main figure').filter({ hasText: destacada.texto });
      await expect(reseña.locator(`a[href="/productos/${destacada.productoSlug}/"]`)).toHaveCount(1);
    }
  });
});
