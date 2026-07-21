import { test, expect } from '@playwright/test';

test.describe('responsive móvil', () => {
  test.skip(({ isMobile }) => !isMobile, 'solo aplica al project mobile');

  const paginas = [
    '/',
    '/productos/',
    '/productos/lamina-vidrio-nintendo-switch/',
    '/productos/fundas-silicona-grips-control-ps5/',
  ];

  for (const path of paginas) {
    test(`no hay overflow horizontal en ${path}`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      );
      expect(overflow).toBe(true);
    });
  }

  test('el header es sticky y sigue visible tras hacer scroll', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await page.mouse.wheel(0, 2000);
    await expect(header).toBeInViewport();
  });
});
