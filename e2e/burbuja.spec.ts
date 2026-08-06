import { test, expect } from '@playwright/test';
import { esperarHidratacion } from './hidratacion';

test.describe('burbuja flotante de Mercado Libre', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), 'la burbuja es solo de escritorio');

  test('en la home apunta a la tienda en pestaña nueva', async ({ page }) => {
    await page.goto('/');
    const burbuja = page.locator('#burbuja-mercadolibre');
    await expect(burbuja).toBeVisible();
    await expect(burbuja).toHaveAttribute('aria-label', 'Ver tienda en Mercado Libre');
    await expect(burbuja).toHaveAttribute('target', '_blank');
    await expect(burbuja).toHaveAttribute('rel', /noopener/);
    await expect(burbuja).toHaveAttribute('href', /perfil\.mercadolibre\.cl/);
  });

  test('en una página de producto apunta al permalink de la publicación', async ({ page }) => {
    await page.goto('/productos/lamina-vidrio-nintendo-switch/');
    const burbuja = page.getByRole('link', { name: 'Ver esta publicación en Mercado Libre' });
    await expect(burbuja).toBeVisible();
    await expect(burbuja).toHaveAttribute('target', '_blank');
    const href = await burbuja.getAttribute('href');
    expect(href).toMatch(/mercadolibre\.cl/);
    expect(href).not.toMatch(/perfil\.mercadolibre\.cl/);
  });

  test('en un producto con variantes apunta siempre al mismo destino que el CTA de la ficha', async ({ page }) => {
    await page.goto('/productos/fundas-silicona-grips-control-ps5/');
    await esperarHidratacion(page);

    const burbuja = page.getByRole('link', { name: 'Ver esta publicación en Mercado Libre' });
    const cta = page.locator('[data-cta="ver-en-mercado-libre"]');

    const hrefInicialBurbuja = await burbuja.getAttribute('href');
    const hrefInicialCta = await cta.getAttribute('href');
    expect(hrefInicialBurbuja).toBe(hrefInicialCta);

    await page.getByRole('button', { name: 'Rojo', exact: true }).click();

    const hrefFinalCta = await cta.getAttribute('href');
    expect(hrefFinalCta).not.toBe(hrefInicialCta);
    await expect(burbuja).toHaveAttribute('href', hrefFinalCta ?? '');
  });

  test('queda fija en la esquina inferior derecha del viewport', async ({ page }) => {
    await page.goto('/');
    const burbuja = page.locator('#burbuja-mercadolibre');
    const viewport = page.viewportSize();
    const caja = await burbuja.boundingBox();
    expect(viewport).not.toBeNull();
    expect(caja).not.toBeNull();
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(viewport!.width);
    expect(caja!.y + caja!.height).toBeLessThanOrEqual(viewport!.height);
    expect(caja!.x).toBeGreaterThan(viewport!.width / 2);
    expect(caja!.y).toBeGreaterThan(viewport!.height / 2);
  });
});
