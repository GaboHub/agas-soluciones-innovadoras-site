import { expect, test, type Page } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { bloquesJsonLd } from '../_jsonld';
import { elegir, enlaceDelCta, fichasConOpciones } from '../_selector';

const variasOpciones = fichasConOpciones.filter(
  ({ gruposFicha }) => gruposFicha.length === 1 && gruposFicha[0].opciones.length > 1,
);
const variosGrupos = fichasConOpciones.filter(({ gruposFicha }) => gruposFicha.length > 1);

const opcionesVisibles = (page: Page, etiqueta: string) =>
  page
    .locator(`xpath=//main//p[starts-with(normalize-space(.), "${etiqueta}:")]/..`)
    .first()
    .getByRole('button');

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
      const activa = gruposFicha[0].opciones[2];
      await elegir(page, etiquetaOpcion, 2);
      expect(await enlaceDelCta(page), ficha.slug).toBe(activa.link);
      await elegir(page, etiquetaGrupo, 1);
      const mismoNombre = gruposFicha[1].opciones.find((opcion) => opcion.nombre === activa.nombre);
      expect(mismoNombre, `${ficha.slug}: el diseño 2 tiene «${activa.nombre}»`).toBeDefined();
      expect(await enlaceDelCta(page), ficha.slug).toBe(mismoNombre!.link);
      await expect(opcionesVisibles(page, etiquetaOpcion).filter({ hasText: activa.nombre }).first(), ficha.slug).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    }
  });

  test('Orden único de opciones', async ({ page }) => {
    const nombresDelGrupo = (grupo: { colores: { color: string }[] }) => grupo.colores.map((color) => color.color).join();
    const conOrdenDistinto = fichasConOpciones.filter(({ ficha }) => {
      const grupos = (ficha.grupos ?? []) as { colores: { color: string }[] }[];
      return grupos.some((grupo) => nombresDelGrupo(grupo) !== nombresDelGrupo(grupos[0]));
    });
    expect(conOrdenDistinto.length).toBeGreaterThan(0);
    for (const { ficha, gruposFicha, etiquetaGrupo, etiquetaOpcion } of conOrdenDistinto) {
      await page.goto(`/productos/${ficha.slug}/`);
      await esperarHidratacion(page);
      const variantes = ((await bloquesJsonLd(page)).find((bloque) => bloque['@type'] === 'ProductGroup')!.hasVariant as { name: string }[]).map(
        (variante) => variante.name,
      );
      const ordenGlobal = gruposFicha[0].opciones.map((opcion) => opcion.nombre);
      for (const [indice, grupo] of gruposFicha.entries()) {
        if (indice > 0) await elegir(page, etiquetaGrupo, indice);
        const enElSelector = await opcionesVisibles(page, etiquetaOpcion).allTextContents();
        const esperado = ordenGlobal.filter((nombre) => grupo.opciones.some((opcion) => opcion.nombre === nombre));
        expect(enElSelector.slice(0, esperado.length), `${ficha.slug}: ${grupo.nombre}`).toEqual(esperado);
        const enElJsonLd = variantes
          .filter((nombre) => nombre.includes(`(${grupo.nombre}, `))
          .map((nombre) => nombre.slice(nombre.indexOf(`(${grupo.nombre}, `) + grupo.nombre.length + 3, -1));
        expect(enElJsonLd, `${ficha.slug}: hasVariant de ${grupo.nombre}`).toEqual(enElSelector);
      }
    }
  });

  test('El selector de grupo es un control segmentado distinto de los chips', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const segmentadas = variosGrupos.filter(({ gruposFicha }) => gruposFicha.length <= 10);
    expect(segmentadas.length).toBeGreaterThan(1);
    for (const { ficha, gruposFicha, etiquetaGrupo, etiquetaOpcion } of segmentadas) {
      await page.goto(`/productos/${ficha.slug}/`);
      await esperarHidratacion(page);
      const grupo = page.getByRole('group', { name: new RegExp(`^${etiquetaGrupo}:`) });
      const botones = grupo.getByRole('button');
      await expect(botones, ficha.slug).toHaveCount(gruposFicha.length);
      const medidas = await botones.evaluateAll((nodos) =>
        nodos.map((nodo) => {
          const caja = nodo.getBoundingClientRect();
          const estilo = getComputedStyle(nodo);
          return { alto: Math.round(caja.height), izquierda: Math.round(caja.left), radio: estilo.borderTopLeftRadius, borde: estilo.borderTopWidth };
        }),
      );
      expect(medidas.every((medida) => medida.alto >= 48 && medida.borde === '2px'), ficha.slug).toBe(true);
      expect(new Set(medidas.map((medida) => medida.izquierda)).size, `${ficha.slug}: columnas`).toBe(2);
      const chip = await opcionesVisibles(page, etiquetaOpcion).first().evaluate((nodo) => getComputedStyle(nodo).borderTopLeftRadius);
      expect(chip, ficha.slug).not.toBe(medidas[0].radio);
      await expect(botones.nth(0), ficha.slug).toHaveAttribute('aria-pressed', 'true');
      await botones.nth(1).click();
      await expect(botones.nth(1), ficha.slug).toHaveAttribute('aria-pressed', 'true');
      await expect(botones.nth(0), ficha.slug).toHaveAttribute('aria-pressed', 'false');
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
