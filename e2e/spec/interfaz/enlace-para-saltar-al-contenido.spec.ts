import { expect, test } from '@playwright/test';
import { paginasDeMuestra } from '../_muestras';

test.describe('[interfaz] Enlace para saltar al contenido', () => {
  test('Primer Tab', async ({ page }) => {
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      await page.keyboard.press('Tab');
      const enlace = page.getByRole('link', { name: 'Saltar al contenido' });
      await expect(enlace, ruta).toBeFocused();
      await expect(enlace, ruta).toHaveAttribute('href', '#contenido');
      await expect(enlace, ruta).toBeInViewport({ ratio: 1 });
      const caja = await enlace.boundingBox();
      expect(caja!.width, ruta).toBeGreaterThan(40);
      expect(caja!.height, ruta).toBeGreaterThan(16);
      const aspecto = await enlace.evaluate((elemento) => {
        let opacidad = 1;
        for (let actual: Element | null = elemento; actual; actual = actual.parentElement) {
          opacidad *= Number(getComputedStyle(actual).opacity);
        }
        const estilo = getComputedStyle(elemento);
        return { opacidad, visibilidad: estilo.visibility, color: estilo.color, fondo: estilo.backgroundColor };
      });
      expect(aspecto.opacidad, ruta).toBe(1);
      expect(aspecto.visibilidad, ruta).toBe('visible');
      expect(aspecto.color, ruta).not.toBe(aspecto.fondo);
    }
  });

  test('Activación', async ({ page }) => {
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      await expect(page.locator('main#contenido'), ruta).toBeFocused();
      await expect(page.locator('main#contenido'), ruta).toHaveAttribute('tabindex', '-1');
    }
  });

  test('Es el primer elemento enfocable de la página', async ({ page }) => {
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      const primero = await page.evaluate(() => {
        const candidatos = document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])');
        return candidatos[0]?.textContent?.trim();
      });
      expect(primero, ruta).toBe('Saltar al contenido');
    }
  });
});
