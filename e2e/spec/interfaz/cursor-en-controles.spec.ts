import { expect, test, type Page } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { muestras } from '../_muestras';

const cursoresDeControles = (page: Page, ambito: string) =>
  page.evaluate(
    (selector) =>
      [...document.querySelectorAll<HTMLElement>(selector)]
        .filter((elemento) => !(elemento as HTMLButtonElement).disabled)
        .map((elemento) => ({
          control: `${elemento.tagName.toLowerCase()} ${(elemento.getAttribute('aria-label') ?? elemento.textContent ?? '').trim().slice(0, 30)}`,
          cursor: getComputedStyle(elemento).cursor,
        })),
    ambito,
  );

const noPointer = (controles: { control: string; cursor: string }[]) =>
  controles.filter(({ cursor }) => cursor !== 'pointer').map(({ control, cursor }) => `${control}: ${cursor}`);

test.describe('[interfaz] Cursor en controles', () => {
  test('Controles de la ficha', async ({ page }) => {
    for (const ficha of [muestras.fichaConGrupos, muestras.fichaSimple]) {
      await page.goto(`/productos/${ficha.slug}/`);
      await esperarHidratacion(page);
      const controles = await cursoresDeControles(page, 'button, select, summary');
      expect(controles.length, ficha.slug).toBeGreaterThan(0);
      expect(noPointer(controles), ficha.slug).toEqual([]);
    }

    await page.goto(`/productos/${muestras.fichaConGrupos.slug}/`);
    await esperarHidratacion(page);
    const selectores = await cursoresDeControles(page, 'select');
    expect(selectores.length).toBeGreaterThan(0);
    expect(noPointer(selectores)).toEqual([]);

    await page.getByRole('button', { name: /Ampliar foto/ }).click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    const delVisor = await cursoresDeControles(page, 'dialog[open] button');
    expect(delVisor.length).toBeGreaterThanOrEqual(3);
    expect(noPointer(delVisor)).toEqual([]);
  });
});
