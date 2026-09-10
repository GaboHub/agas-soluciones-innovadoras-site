import { test, expect } from '@playwright/test';
import { esperarHidratacion } from './hidratacion';

test.describe('familia de fundas PS5', () => {
  test('agrupa por diseño (select, por ser más de 10) y muestra selector de color', async ({ page }) => {
    await page.goto('/productos/fundas-silicona-grips-control-ps5/');
    await esperarHidratacion(page);
    const selectDiseno = page.getByLabel(/^Diseño:/);
    await expect(selectDiseno).toBeVisible();
    const nombresDiseno = await selectDiseno.locator('option').allTextContents();
    expect(nombresDiseno.length).toBeGreaterThan(10);

    await expect(page.getByText('Color:', { exact: false })).toBeVisible();
    const botonesColor = page.getByRole('button', { name: /Rojo|Azul|Verde|Amarillo|Blanco|Gris|Morado|Negro|Rosado/ });
    expect(await botonesColor.count()).toBeGreaterThanOrEqual(2);
  });

  test('el link de Mercado Libre cambia según el color elegido', async ({ page }) => {
    await page.goto('/productos/fundas-silicona-grips-control-ps5/');
    await esperarHidratacion(page);
    const cta = page.locator('[data-cta="ver-en-mercado-libre"]');
    const hrefInicial = await cta.getAttribute('href');
    expect(hrefInicial).toMatch(/^https:\/\/articulo\.mercadolibre\.cl\/MLC-/);

    await page.getByRole('button', { name: 'Rojo', exact: true }).click();
    await expect(cta).not.toHaveAttribute('href', hrefInicial ?? '');
    await expect(cta).toHaveAttribute('href', /^https:\/\/articulo\.mercadolibre\.cl\/MLC-/);
  });

  test('cambiar el diseño también cambia el link y reinicia el color', async ({ page }) => {
    await page.goto('/productos/fundas-silicona-grips-control-ps5/');
    await esperarHidratacion(page);
    const cta = page.locator('[data-cta="ver-en-mercado-libre"]');
    const hrefInicial = await cta.getAttribute('href');

    const selectDiseno = page.getByLabel(/^Diseño:/);
    await selectDiseno.selectOption({ label: 'Camo Blanco' });
    await expect(page.getByText('Diseño:', { exact: false })).toContainText('Camo Blanco');

    await expect(cta).not.toHaveAttribute('href', hrefInicial ?? '');
    await expect(cta).toHaveAttribute('href', /^https:\/\/articulo\.mercadolibre\.cl\/MLC-/);
  });

  test('el CTA de la familia se abre en pestaña nueva con noopener', async ({ page }) => {
    await page.goto('/productos/fundas-silicona-grips-control-ps5/');
    await esperarHidratacion(page);
    const cta = page.locator('[data-cta="ver-en-mercado-libre"]');
    await expect(cta).toHaveAttribute('target', '_blank');
    await expect(cta).toHaveAttribute('rel', /noopener/);
  });
});
