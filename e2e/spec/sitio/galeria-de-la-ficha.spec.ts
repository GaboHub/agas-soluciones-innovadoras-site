import { expect, test, type Page } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { bloquesJsonLd } from '../_jsonld';
import { muestras } from '../_muestras';
import { elegir, enlaceDelCta, fichasConOpciones } from '../_selector';

const conTresFotos = fichasConOpciones.find(({ gruposFicha }) => gruposFicha[0].opciones[0].rutasImagenes.length >= 3)!;
const rutaDeFicha = `/productos/${conTresFotos.ficha.slug}/`;
const nombresDeFoto = conTresFotos.gruposFicha[0].opciones[0].rutasImagenes.map(
  (ruta: string) => ruta.match(/([^/]+)\.[a-z]+$/)![1],
);
const srcDeFoto = (indice: number) => new RegExp(`^/_astro/${nombresDeFoto[indice]}\\.`);

const claveDeAsset = (url: string) =>
  new URL(url, 'http://localhost').pathname.split('/').pop()!.replace(/\.[a-z]+$/, '').replace(/_[^_]+$/, '');

const simpleConTresFotos = muestras.fichas.find((ficha) => ficha.tipo === 'simple' && (ficha.imagenes as string[]).length >= 3)!;
const conGrupos = fichasConOpciones.find(({ ficha }) => ficha.slug === muestras.fichaConGrupos.slug)!;

const clavePrincipal = async (page: Page) =>
  claveDeAsset((await page.locator('main img[fetchpriority="high"]').getAttribute('src'))!);

const clavesDeMiniaturas = async (page: Page) =>
  (
    await page
      .getByRole('button', { name: /foto principal/i })
      .locator('img')
      .evaluateAll((imagenes) => imagenes.map((imagen) => imagen.getAttribute('src')!))
  ).map(claveDeAsset);

const claveDelVisor = async (page: Page) => claveDeAsset((await page.getByRole('dialog').locator('img').getAttribute('src'))!);

test.describe('[sitio] Galería de la ficha', () => {
  test('La foto principal carga con fetchpriority high y cada foto lleva alt «Foto N de …»', async ({ page }) => {
    await page.goto(rutaDeFicha);
    await esperarHidratacion(page);
    await expect(page.locator('main img[fetchpriority="high"]')).toHaveCount(1);
    const alts = await page
      .getByRole('button', { name: /foto principal/i })
      .locator('img')
      .evaluateAll((imagenes) => imagenes.map((imagen) => imagen.getAttribute('alt')));
    expect(alts.length).toBeGreaterThanOrEqual(3);
    alts.forEach((alt, indice) => expect(alt).toMatch(new RegExp(`^Foto ${indice + 1} de .+`)));
    expect(await page.locator('main img[fetchpriority="high"]').getAttribute('alt')).toMatch(/^Foto 1 de .+/);
    await expect(page.locator('main img[fetchpriority="high"]')).toHaveAttribute('src', srcDeFoto(0));
    const miniaturas = await page
      .getByRole('button', { name: /foto principal/i })
      .locator('img')
      .evaluateAll((imagenes) => imagenes.map((imagen) => imagen.getAttribute('src')));
    expect(miniaturas).toHaveLength(nombresDeFoto.length);
    miniaturas.forEach((src, indice) => expect(src).toMatch(srcDeFoto(indice)));
  });

  test('Miniatura', async ({ page }) => {
    await page.goto(rutaDeFicha);
    await esperarHidratacion(page);
    const miniaturas = page.getByRole('button', { name: /foto principal/i });
    await expect(miniaturas.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await miniaturas.nth(2).click();
    await expect(miniaturas.nth(2)).toHaveAttribute('aria-pressed', 'true');
    await expect(miniaturas.nth(0)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('main img[fetchpriority="high"]')).toHaveAttribute('alt', /^Foto 3 de /);
    await expect(page.locator('main img[fetchpriority="high"]')).toHaveAttribute('src', srcDeFoto(2));
    await miniaturas.nth(1).click();
    await expect(page.locator('main img[fetchpriority="high"]')).toHaveAttribute('src', srcDeFoto(1));
  });

  test('Visor modal', async ({ page }) => {
    await page.goto(rutaDeFicha);
    await esperarHidratacion(page);
    const abrir = page.getByRole('button', { name: /ampliar foto/i });
    await abrir.focus();
    await abrir.click();
    const visor = page.getByRole('dialog');
    await expect(visor).toBeVisible();
    await expect(visor.getByRole('button', { name: /cerrar/i })).toBeVisible();
    await expect(visor.getByRole('button', { name: /anterior/i })).toBeVisible();
    await expect(visor.getByRole('button', { name: /siguiente/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(visor).toBeHidden();
    await expect(abrir).toBeFocused();
  });

  test('El visor navega entre fotos con anterior y siguiente', async ({ page }) => {
    await page.goto(rutaDeFicha);
    await esperarHidratacion(page);
    await page.getByRole('button', { name: /ampliar foto/i }).click();
    const visor = page.getByRole('dialog');
    const imagen = visor.locator('img');
    await expect(imagen).toHaveAttribute('alt', /^Foto 1 de /);
    await expect(imagen).toHaveAttribute('src', srcDeFoto(0));
    await visor.getByRole('button', { name: /siguiente/i }).click();
    await expect(imagen).toHaveAttribute('alt', /^Foto 2 de /);
    await expect(imagen).toHaveAttribute('src', srcDeFoto(1));
    await visor.getByRole('button', { name: /anterior/i }).click();
    await expect(imagen).toHaveAttribute('alt', /^Foto 1 de /);
    await expect(imagen).toHaveAttribute('src', srcDeFoto(0));
    await visor.getByRole('button', { name: /anterior/i }).click();
    await expect(imagen).toHaveAttribute('alt', new RegExp(`^Foto ${nombresDeFoto.length} de `));
    await expect(imagen).toHaveAttribute('src', srcDeFoto(nombresDeFoto.length - 1));
    await visor.getByRole('button', { name: /cerrar/i }).click();
    await expect(visor).toBeHidden();
  });

  test('El visor se abre en la foto elegida', async ({ page }) => {
    await page.goto(rutaDeFicha);
    await esperarHidratacion(page);
    await page.getByRole('button', { name: /foto principal/i }).nth(2).click();
    await page.getByRole('button', { name: /ampliar foto/i }).click();
    const imagen = page.getByRole('dialog').locator('img');
    await expect(imagen).toHaveAttribute('alt', /^Foto 3 de /);
    await expect(imagen).toHaveAttribute('src', srcDeFoto(2));
  });

  test('Identidad completa de las fotos en una ficha simple', async ({ page }) => {
    await page.goto(`/productos/${simpleConTresFotos.slug}/`);
    await esperarHidratacion(page);
    const producto = (await bloquesJsonLd(page)).find((bloque) => bloque['@type'] === 'Product')!;
    const esperadas = (producto.image as string[]).map(claveDeAsset);
    expect(esperadas.length).toBeGreaterThanOrEqual(3);
    expect(await clavePrincipal(page)).toBe(esperadas[0]);
    expect((await clavesDeMiniaturas(page)).slice(0, esperadas.length)).toEqual(esperadas);
    await page.getByRole('button', { name: /foto principal/i }).nth(2).click();
    await expect.poll(() => clavePrincipal(page)).toBe(esperadas[2]);
    await page.getByRole('button', { name: /ampliar foto/i }).click();
    expect(await claveDelVisor(page)).toBe(esperadas[2]);
    await page.getByRole('dialog').getByRole('button', { name: /anterior/i }).click();
    await expect.poll(() => claveDelVisor(page)).toBe(esperadas[1]);
    await page.getByRole('dialog').getByRole('button', { name: /anterior/i }).click();
    await expect.poll(() => claveDelVisor(page)).toBe(esperadas[0]);
  });

  test('Identidad completa de las fotos en cada opción de una ficha con opciones', async ({ page }) => {
    test.slow();
    await page.goto(`/productos/${conGrupos.ficha.slug}/`);
    await esperarHidratacion(page);
    const grupo = (await bloquesJsonLd(page)).find((bloque) => bloque['@type'] === 'ProductGroup')!;
    const imagenPorEnlace = new Map<string, string>(
      (grupo.hasVariant as { offers: { url: string }; image: string }[]).map((variante) => [variante.offers.url, claveDeAsset(variante.image)]),
    );
    const combinaciones: [number, number][] = conGrupos.gruposFicha.flatMap((grupoFicha, indiceGrupo) =>
      [...grupoFicha.opciones.keys()].map((indiceOpcion): [number, number] => [indiceGrupo, indiceOpcion]),
    );
    expect(combinaciones.length).toBeGreaterThan(1);
    const vistas = new Set<string>();
    for (const [posicion, [indiceGrupo, indiceOpcion]] of combinaciones.entries()) {
      if (conGrupos.gruposFicha.length > 1) await elegir(page, conGrupos.etiquetaGrupo, indiceGrupo);
      if (conGrupos.gruposFicha[indiceGrupo].opciones.length > 1) await elegir(page, conGrupos.etiquetaOpcion, indiceOpcion);
      const esperada = imagenPorEnlace.get((await enlaceDelCta(page))!)!;
      expect(esperada, `opción ${posicion}`).toBeDefined();
      vistas.add(esperada);
      const grupoDeDatos = (conGrupos.ficha.grupos as { colores: { imagenes: string[] }[] }[])[indiceGrupo];
      const nombreDeDatos = grupoDeDatos.colores[indiceOpcion].imagenes[0].match(/([^/]+)\.[a-z]+$/)![1];
      expect(esperada.startsWith(`${nombreDeDatos}.`), `nombre de datos ${posicion}`).toBe(true);
      await expect.poll(() => clavePrincipal(page), `principal ${posicion}`).toBe(esperada);
      expect((await clavesDeMiniaturas(page))[0], `miniatura ${posicion}`).toBe(esperada);
      if (posicion === 0 || posicion === combinaciones.length - 1) {
        await page.getByRole('button', { name: /ampliar foto/i }).click();
        expect(await claveDelVisor(page), `visor ${posicion}`).toBe(esperada);
        await page.keyboard.press('Escape');
      }
    }
    expect(vistas.size).toBeGreaterThan(1);
  });
});
