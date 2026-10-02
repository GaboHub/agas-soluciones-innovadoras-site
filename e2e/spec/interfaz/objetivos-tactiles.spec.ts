import { expect, test } from '@playwright/test';
import { construirGruposFicha, type ProductoFicha } from '../../../src/lib/ficha';
import { esperarHidratacion } from '../_hidratacion';
import { muestras, paginasDeMuestra } from '../_muestras';
import { medirObjetivos, separacion, sinAreaMinima, type Objetivo } from './_objetivos';

const conChips = (cantidad: number) => cantidad >= 2 && cantidad <= 10;

const fichaConChips = [...muestras.fichas]
  .sort((a, b) => a.slug.localeCompare(b.slug))
  .find((ficha) => {
    if (ficha.tipo === 'simple') return false;
    const { gruposFicha } = construirGruposFicha(ficha as unknown as ProductoFicha);
    return conChips(gruposFicha.length) || conChips(gruposFicha[0].opciones.length);
  });

const fichaConVariasFotos = [...muestras.fichas]
  .sort((a, b) => a.slug.localeCompare(b.slug))
  .find((ficha) => {
    const { gruposFicha } = construirGruposFicha(ficha as unknown as ProductoFicha);
    return gruposFicha[0].opciones[0].rutasImagenes.length >= 2;
  });

const sinAreaNiSeparacion = (objetivos: Objetivo[]) =>
  objetivos
    .filter((objetivo) => objetivo.ancho < 44 || objetivo.alto < 44)
    .filter((objetivo) => objetivos.some((otro) => otro !== objetivo && separacion(objetivo, otro) < 8))
    .map((objetivo) => objetivo.rotulo);

test.describe('[interfaz] Objetivos táctiles', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), 'el ancho se fija con el viewport del proyecto de escritorio');
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test('Recorrido móvil', async ({ page }) => {
    const incumplen: string[] = [];
    for (const ruta of paginasDeMuestra) {
      await page.goto(ruta);
      await esperarHidratacion(page);
      const objetivos = await medirObjetivos(page);
      expect(objetivos.length, ruta).toBeGreaterThan(5);
      incumplen.push(...sinAreaMinima(objetivos).map((objetivo) => `${ruta}: ${objetivo}`));
    }
    expect(incumplen).toEqual([]);
  });

  test('Controles del visor de fotos', async ({ page }) => {
    expect(fichaConVariasFotos, 'una ficha con varias fotos').toBeDefined();
    await page.goto(`/productos/${fichaConVariasFotos!.slug}/`);
    await esperarHidratacion(page);
    await page.getByRole('button', { name: /Ampliar foto/ }).click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    const controles = await medirObjetivos(page, 'dialog[open] button');
    expect(controles.map((control) => control.rotulo)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Cerrar foto ampliada'),
        expect.stringContaining('Foto anterior'),
        expect.stringContaining('Foto siguiente'),
      ]),
    );
    expect(sinAreaMinima(controles)).toEqual([]);
  });

  test('Chips de variante', async ({ page }) => {
    expect(fichaConChips, 'una ficha con chips de opción').toBeDefined();
    await page.goto(`/productos/${fichaConChips!.slug}/`);
    await esperarHidratacion(page);
    const chips = await medirObjetivos(page, 'main button[aria-pressed]:not(:has(img))');
    expect(chips.length).toBeGreaterThanOrEqual(2);
    expect(chips.filter((chip) => chip.alto < 44).map((chip) => `${chip.rotulo} (${Math.round(chip.alto)}px)`)).toEqual([]);
  });

  test('Footer y menú', async ({ page }) => {
    await page.goto('/');
    await esperarHidratacion(page);
    const delFooter = await medirObjetivos(page, 'footer a[href]');
    expect(delFooter.length).toBeGreaterThanOrEqual(8);
    expect(sinAreaNiSeparacion(delFooter)).toEqual([]);

    await page.locator('#menu-movil summary').click();
    await expect(page.locator('#menu-movil')).toHaveAttribute('open', '');
    const delMenu = await medirObjetivos(page, '#menu-movil nav a[href]');
    expect(delMenu.length).toBeGreaterThanOrEqual(6);
    expect(sinAreaNiSeparacion(delMenu)).toEqual([]);
  });
});
