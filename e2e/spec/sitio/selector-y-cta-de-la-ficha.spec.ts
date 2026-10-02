import { expect, test } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { elegir, enlaceDelCta, fichasConOpciones } from '../_selector';

const variasOpciones = fichasConOpciones.filter(
  ({ gruposFicha }) => gruposFicha.length === 1 && gruposFicha[0].opciones.length > 1,
);
const variosGrupos = fichasConOpciones.filter(({ gruposFicha }) => gruposFicha.length > 1);

test.describe('[sitio] Selector y CTA de la ficha', () => {
  test('El CTA apunta a la opción activa con target _blank y rel noopener', async ({ page }) => {
    for (const { ficha, gruposFicha } of fichasConOpciones) {
      await page.goto(`/productos/${ficha.slug}/`);
      const cta = page.locator('[data-cta="ver-en-mercado-libre"]');
      await expect(cta, ficha.slug).toHaveAttribute('href', gruposFicha[0].opciones[0].link);
      await expect(cta, ficha.slug).toHaveAttribute('target', '_blank');
      await expect(cta, ficha.slug).toHaveAttribute('rel', 'noopener');
    }
  });

  test('Cambio de color', async ({ page }) => {
    test.skip(variasOpciones.length === 0, 'ninguna ficha tiene un solo grupo con varias opciones');
    for (const { ficha, gruposFicha, etiquetaOpcion } of variasOpciones) {
      await page.goto(`/productos/${ficha.slug}/`);
      await esperarHidratacion(page);
      const opciones = gruposFicha[0].opciones;
      for (const indice of [1, opciones.length - 1]) {
        await elegir(page, etiquetaOpcion, indice);
        expect(await enlaceDelCta(page), `${ficha.slug}: opción ${indice}`).toBe(opciones[indice].link);
      }
    }
  });

  test('Cambio de grupo', async ({ page }) => {
    expect(variosGrupos.length).toBeGreaterThan(0);
    for (const { ficha, gruposFicha, etiquetaGrupo, etiquetaOpcion } of variosGrupos) {
      await page.goto(`/productos/${ficha.slug}/`);
      await esperarHidratacion(page);
      await elegir(page, etiquetaOpcion, 2);
      expect(await enlaceDelCta(page), ficha.slug).toBe(gruposFicha[0].opciones[2].link);
      await elegir(page, etiquetaGrupo, 1);
      expect(await enlaceDelCta(page), ficha.slug).toBe(gruposFicha[1].opciones[0].link);
    }
  });

  test('El selector de grupo y el de opción existen solo cuando hay más de uno', async ({ page }) => {
    for (const { ficha, gruposFicha, etiquetaGrupo, etiquetaOpcion } of fichasConOpciones) {
      await page.goto(`/productos/${ficha.slug}/`);
      await esperarHidratacion(page);
      const rotulo = (etiqueta: string) =>
        page.locator(`xpath=//main//*[self::p or self::label][starts-with(normalize-space(.), "${etiqueta}:")]`);
      await expect(rotulo(etiquetaGrupo), `${ficha.slug}: grupo`).toHaveCount(gruposFicha.length > 1 ? 1 : 0);
      await expect(rotulo(etiquetaOpcion), `${ficha.slug}: opción`).toHaveCount(gruposFicha[0].opciones.length > 1 ? 1 : 0);
    }
  });

  test('Muchas opciones', async ({ page }) => {
    const conMuchas = fichasConOpciones.filter(({ gruposFicha }) => gruposFicha.length > 10);
    test.skip(conMuchas.length === 0, 'ninguna ficha tiene más de 10 opciones en un selector');
    for (const { ficha, gruposFicha, etiquetaGrupo } of conMuchas) {
      await page.goto(`/productos/${ficha.slug}/`);
      await esperarHidratacion(page);
      const select = page.getByLabel(new RegExp(`^${etiquetaGrupo}:`));
      await expect(select, ficha.slug).toHaveJSProperty('tagName', 'SELECT');
      await expect(select.locator('option'), ficha.slug).toHaveCount(gruposFicha.length);
      await expect(page.getByRole('button', { name: gruposFicha[0].nombre, exact: true }), ficha.slug).toHaveCount(0);
    }
  });

  test('Hasta 10 opciones los botones llevan aria-pressed y marcan la activa', async ({ page }) => {
    const ficha = variasOpciones.find(({ gruposFicha }) => gruposFicha[0].opciones.length <= 10)!;
    await page.goto(`/productos/${ficha.ficha.slug}/`);
    await esperarHidratacion(page);
    const botones = page
      .locator(`xpath=//main//p[starts-with(normalize-space(.), "${ficha.etiquetaOpcion}:")]/..`)
      .getByRole('button');
    await expect(botones).toHaveCount(ficha.gruposFicha[0].opciones.length);
    await expect(botones.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await botones.nth(1).click();
    await expect(botones.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(botones.nth(0)).toHaveAttribute('aria-pressed', 'false');
  });

  test('La galería muestra las fotos de la opción activa', async ({ page }) => {
    const candidata = variasOpciones.find(
      ({ gruposFicha }) => gruposFicha[0].opciones[0].rutasImagenes[0] !== gruposFicha[0].opciones[1].rutasImagenes[0],
    );
    test.skip(!candidata, 'ninguna ficha tiene fotos distintas por opción');
    const { ficha, gruposFicha, etiquetaOpcion } = candidata!;
    await page.goto(`/productos/${ficha.slug}/`);
    await esperarHidratacion(page);
    const principal = page.locator('main img[fetchpriority="high"]');
    const antes = await principal.getAttribute('src');
    await elegir(page, etiquetaOpcion, 1);
    await expect(principal).not.toHaveAttribute('src', antes!);
    const miniaturas = page.getByRole('button', { name: /foto principal/i });
    const fotosDeLaOpcion = gruposFicha[0].opciones[1].rutasImagenes.length;
    await expect(miniaturas).toHaveCount(fotosDeLaOpcion > 1 ? fotosDeLaOpcion : 0);
  });
});
