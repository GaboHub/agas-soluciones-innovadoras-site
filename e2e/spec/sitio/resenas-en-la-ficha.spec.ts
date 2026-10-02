import { expect, test } from '@playwright/test';
import { muestras } from '../_muestras';

const normalizar = (texto: string) => texto.replace(/\s+/g, ' ').trim();

const conResenas = muestras.fichas.filter((ficha) => (ficha.reviews?.cantidad ?? 0) > 0);

test.describe('[sitio] Reseñas en la ficha', () => {
  test('Ficha con reseñas', async ({ page }) => {
    expect(conResenas.some((ficha) => ficha.reviews.comentarios.some((comentario: { texto: string }) => comentario.texto.trim()))).toBe(true);
    for (const ficha of conResenas) {
      await page.goto(`/productos/${ficha.slug}/`);
      const region = page.getByRole('region', { name: 'Opiniones de compradores' });
      await expect(region, ficha.slug).toBeVisible();
      const texto = await region.innerText();
      const { promedio, cantidad, distribucion, comentarios } = ficha.reviews;
      expect(texto, ficha.slug).toContain(`${promedio.toFixed(1)} de 5 estrellas`);
      expect(texto, ficha.slug).toMatch(new RegExp(`^Opiniones de compradores\\n+${promedio.toFixed(1)}\\n`));
      expect(texto, ficha.slug).toContain(`${cantidad} ${cantidad === 1 ? 'calificación' : 'calificaciones'}`);
      for (const nivel of [5, 4, 3, 2, 1]) {
        expect(texto, `${ficha.slug}: nivel ${nivel}`).toMatch(
          new RegExp(`(^|\\n)${nivel}[^\\d\\n]*\\n${distribucion[String(nivel)] ?? 0}(\\n|$)`),
        );
      }
      const conTexto = comentarios.filter((comentario: { texto: string }) => comentario.texto.trim());
      await expect(region.locator('figure'), ficha.slug).toHaveCount(conTexto.length);
      const citas = (await region.locator('blockquote').allTextContents()).map(normalizar);
      expect(citas, ficha.slug).toEqual(conTexto.map((comentario: { texto: string }) => `“${normalizar(comentario.texto)}”`));
    }
  });

  test('Una ficha sin reseñas no muestra el bloque', async ({ page }) => {
    const sinResenas = muestras.fichas.find((ficha) => (ficha.reviews?.cantidad ?? 0) === 0);
    test.skip(!sinResenas, 'todas las fichas tienen reseñas');
    await page.goto(`/productos/${sinResenas!.slug}/`);
    await expect(page.getByRole('region', { name: 'Opiniones de compradores' })).toHaveCount(0);
  });
});
