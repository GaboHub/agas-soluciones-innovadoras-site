import { test, expect, type Locator } from '@playwright/test';

async function areaInterseccion(a: Locator, b: Locator): Promise<number> {
  const cajaA = await a.boundingBox();
  const cajaB = await b.boundingBox();
  if (!cajaA || !cajaB) {
    throw new Error('No se pudo obtener boundingBox de uno de los elementos');
  }

  const izquierda = Math.max(cajaA.x, cajaB.x);
  const derecha = Math.min(cajaA.x + cajaA.width, cajaB.x + cajaB.width);
  const arriba = Math.max(cajaA.y, cajaB.y);
  const abajo = Math.min(cajaA.y + cajaA.height, cajaB.y + cajaB.height);

  const ancho = Math.max(0, derecha - izquierda);
  const alto = Math.max(0, abajo - arriba);
  return ancho * alto;
}

test.describe('constelación de marca en el hero', () => {
  test('la leyenda no se solapa con ninguna baldosa de la constelación', async ({ page }) => {
    await page.goto('/');

    const leyenda = page.getByTestId('constelacion-leyenda');
    await expect(leyenda).toBeVisible();

    const baldosas = page.getByTestId('constelacion-baldosa');
    await expect(baldosas).toHaveCount(4);

    for (let i = 0; i < 4; i++) {
      const baldosa = baldosas.nth(i);
      const area = await areaInterseccion(leyenda, baldosa);
      expect(area, `la leyenda se solapa con la baldosa ${i}`).toBe(0);
    }
  });
});
