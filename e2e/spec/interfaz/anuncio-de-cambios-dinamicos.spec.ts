import { expect, test } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { elegir, fichasConOpciones } from '../_selector';
import { muestras } from '../_muestras';

const conChips = (cantidad: number) => cantidad >= 2 && cantidad <= 10;

const fichaParaElAnuncio = [...fichasConOpciones]
  .filter(({ gruposFicha }) => gruposFicha.length === 1 && conChips(gruposFicha[0].opciones.length))
  .sort((a, b) => {
    const precios = (ficha: typeof a) => new Set(ficha.gruposFicha[0].opciones.map((opcion) => opcion.precioTexto)).size;
    return precios(b) - precios(a) || a.ficha.slug.localeCompare(b.ficha.slug);
  })[0];

const palabraDeUnTitulo = muestras.fichas
  .map((ficha) => String(ficha.titulo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))
  .flatMap((titulo) => titulo.split(/[^a-z0-9]+/).filter((palabra) => palabra.length >= 5))
  .find((palabra) => {
    const coinciden = muestras.fichas.filter((ficha) =>
      String(ficha.titulo).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(palabra),
    ).length;
    return coinciden > 0 && coinciden < muestras.fichas.length;
  })!;

test.describe('[interfaz] Anuncio de cambios dinámicos', () => {
  test('Búsqueda', async ({ page }) => {
    await page.goto('/productos/');
    await esperarHidratacion(page);
    const estado = page.locator('main [role="status"]');
    await expect(estado).toHaveCount(1);
    const listados = page.locator('main li a[href^="/productos/"]');

    await page.getByRole('searchbox').fill(palabraDeUnTitulo);
    const cantidad = await listados.count();
    expect(cantidad).toBeGreaterThan(0);
    expect(cantidad).toBeLessThan(muestras.fichas.length);
    await expect(estado).toHaveText(`${cantidad} productos`);

    await page.getByRole('searchbox').fill('zzzzzzzz');
    await expect(listados).toHaveCount(0);
    await expect(estado).toHaveText('Sin resultados para tu búsqueda');

    await page.getByRole('searchbox').fill('');
    await expect(estado).toHaveText(`${muestras.fichas.length} productos`);
  });

  test('Cambio de opción', async ({ page }) => {
    expect(fichaParaElAnuncio, 'una ficha con opciones en chips').toBeDefined();
    const { ficha, gruposFicha, etiquetaOpcion } = fichaParaElAnuncio;
    const opciones = gruposFicha[0].opciones;
    await page.goto(`/productos/${ficha.slug}/`);
    await esperarHidratacion(page);
    const anuncio = page.locator('main [aria-live="polite"]');
    await expect(anuncio).toHaveCount(1);
    await expect(anuncio).toContainText(opciones[0].nombre);
    await expect(anuncio).toContainText(opciones[0].precioTexto);
    const antes = await anuncio.innerText();

    await elegir(page, etiquetaOpcion, 1);
    await expect(anuncio).toContainText(opciones[1].nombre);
    await expect(anuncio).toContainText(opciones[1].precioTexto);
    expect(await anuncio.innerText()).not.toBe(antes);
  });
});
