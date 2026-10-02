import { expect, test, type Page } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';

const LIMITE_DE_LA_ANIMACION_MS = 5000;
const ESPERA_MS = 5500;

const animacionesEnCurso = (page: Page, ambito: string): Promise<number> =>
  page.evaluate(
    (selector) =>
      document
        .getAnimations()
        .filter((animacion) => animacion.playState !== 'finished' && animacion.playState !== 'idle')
        .filter((animacion) => selector === '' || (animacion.effect as KeyframeEffect).target?.closest(selector))
        .length,
    ambito,
  );

const AMBITO_CONSTELACION = '[data-testid="constelacion-baldosa"]';

test.describe('[marca] Hero de marca', () => {
  test.setTimeout(60000);

  test('Leyenda libre', async ({ page }) => {
    await page.goto('/');
    await esperarHidratacion(page);

    const leyenda = page.getByTestId('constelacion-leyenda');
    await expect(leyenda).toBeVisible();
    const baldosas = page.getByTestId('constelacion-baldosa');
    await expect(baldosas).toHaveCount(4);

    const cajaDeLeyenda = await leyenda.boundingBox();
    expect(cajaDeLeyenda).not.toBeNull();
    for (let indice = 0; indice < 4; indice++) {
      const caja = await baldosas.nth(indice).boundingBox();
      expect(caja, `baldosa ${indice}`).not.toBeNull();
      const ancho = Math.min(cajaDeLeyenda!.x + cajaDeLeyenda!.width, caja!.x + caja!.width) - Math.max(cajaDeLeyenda!.x, caja!.x);
      const alto = Math.min(cajaDeLeyenda!.y + cajaDeLeyenda!.height, caja!.y + caja!.height) - Math.max(cajaDeLeyenda!.y, caja!.y);
      expect(ancho > 0 && alto > 0, `la leyenda intersecta la baldosa ${indice}`).toBe(false);
    }
  });

  test('Animación acotada', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await esperarHidratacion(page);

    const duraciones = await page.evaluate(
      (selector) =>
        document
          .getAnimations()
          .filter((animacion) => (animacion.effect as KeyframeEffect).target?.closest(selector))
          .map((animacion) => animacion.effect!.getComputedTiming().endTime as number),
      AMBITO_CONSTELACION,
    );
    expect(duraciones).toHaveLength(4);
    for (const fin of duraciones) expect(fin).toBeLessThanOrEqual(LIMITE_DE_LA_ANIMACION_MS);

    expect(await animacionesEnCurso(page, AMBITO_CONSTELACION)).toBeGreaterThan(0);
    await page.waitForTimeout(ESPERA_MS);
    expect(await animacionesEnCurso(page, AMBITO_CONSTELACION)).toBe(0);
  });

  test('Movimiento reducido', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await esperarHidratacion(page);

    await expect(page.getByTestId('constelacion-baldosa')).toHaveCount(4);
    expect(await animacionesEnCurso(page, '')).toBe(0);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
});
