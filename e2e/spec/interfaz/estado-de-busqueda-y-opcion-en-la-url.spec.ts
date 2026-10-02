import { expect, test, type Page } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import { elegir, enlaceDelCta, fichasConOpciones } from '../_selector';
import { muestras } from '../_muestras';

const slug = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const sinTildes = (texto: string) => texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const consultaDeMuestra = muestras.fichas
  .flatMap((ficha) => sinTildes(String(ficha.titulo)).split(/[^a-z0-9]+/).filter((palabra) => palabra.length >= 5))
  .find((palabra) => {
    const coinciden = muestras.fichas.filter((ficha) => sinTildes(String(ficha.titulo)).includes(palabra)).length;
    return coinciden > 0 && coinciden < muestras.fichas.length;
  })!;

const deUnGrupo = fichasConOpciones.find(({ gruposFicha }) => gruposFicha.length === 1 && gruposFicha[0].opciones.length > 1);
const deVariosGrupos = fichasConOpciones.find(
  ({ gruposFicha }) => gruposFicha.length > 1 && gruposFicha[1].opciones.length > 1,
);

const slugsListados = async (page: Page) =>
  (await page.locator('main li a[href^="/productos/"]').evaluateAll((enlaces) => enlaces.map((enlace) => enlace.getAttribute('href')!))).map(
    (href) => href.split('/')[2],
  );

const canonical = (page: Page) => page.locator('link[rel="canonical"]').getAttribute('href');

const entradasDeHistorial = (page: Page) => page.evaluate(() => history.length);

test.describe('[interfaz] Estado de búsqueda y opción en la URL', () => {
  test('Búsqueda compartida', async ({ page }) => {
    await page.goto('/productos/');
    await esperarHidratacion(page);
    await page.getByRole('searchbox').fill(consultaDeMuestra);
    const escritos = await slugsListados(page);
    expect(escritos.length).toBeGreaterThan(0);
    expect(escritos.length).toBeLessThan(muestras.fichas.length);

    await page.goto(`/productos/?q=${encodeURIComponent(consultaDeMuestra)}`);
    await esperarHidratacion(page);
    await expect(page.getByRole('searchbox')).toHaveValue(consultaDeMuestra);
    await expect.poll(() => slugsListados(page)).toEqual(escritos);
  });

  test('Escribir una consulta la refleja en ?q= con replaceState', async ({ page }) => {
    await page.goto('/productos/');
    await esperarHidratacion(page);
    const antes = await entradasDeHistorial(page);
    await page.getByRole('searchbox').fill(consultaDeMuestra);
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(consultaDeMuestra);
    expect(await entradasDeHistorial(page)).toBe(antes);
    await page.getByRole('searchbox').fill('');
    await expect.poll(() => new URL(page.url()).searchParams.has('q')).toBe(false);
    expect(await entradasDeHistorial(page)).toBe(antes);
  });

  test('Opción compartida', async ({ page }) => {
    expect(deUnGrupo, 'una ficha de un grupo con varias opciones').toBeDefined();
    expect(deVariosGrupos, 'una ficha de varios grupos').toBeDefined();

    const { ficha, gruposFicha } = deUnGrupo!;
    await page.goto(`/productos/${ficha.slug}/`);
    const canonicalBase = await canonical(page);
    expect(canonicalBase).not.toContain('?');
    await page.goto(`/productos/${ficha.slug}/?opcion=${slug(gruposFicha[0].opciones[1].nombre)}`);
    await esperarHidratacion(page);
    await expect(page.locator('[data-cta="ver-en-mercado-libre"]')).toHaveAttribute('href', gruposFicha[0].opciones[1].link);
    await expect(page.locator('#burbuja-mercadolibre')).toHaveAttribute('href', gruposFicha[0].opciones[1].link);
    expect(await canonical(page)).toBe(canonicalBase);

    const agrupada = deVariosGrupos!;
    const segundo = agrupada.gruposFicha[1];
    await page.goto(`/productos/${agrupada.ficha.slug}/?opcion=${slug(segundo.nombre)}-${slug(segundo.opciones[1].nombre)}`);
    await esperarHidratacion(page);
    await expect(page.locator('[data-cta="ver-en-mercado-libre"]')).toHaveAttribute('href', segundo.opciones[1].link);
    expect(await canonical(page)).not.toContain('?');
  });

  test('Elegir una opción la refleja en ?opcion= con replaceState', async ({ page }) => {
    expect(deUnGrupo).toBeDefined();
    const { ficha, gruposFicha, etiquetaOpcion } = deUnGrupo!;
    await page.goto(`/productos/${ficha.slug}/`);
    await esperarHidratacion(page);
    const antes = await entradasDeHistorial(page);
    await elegir(page, etiquetaOpcion, 1);
    await expect.poll(() => new URL(page.url()).searchParams.get('opcion')).toBe(slug(gruposFicha[0].opciones[1].nombre));
    expect(await entradasDeHistorial(page)).toBe(antes);
    expect(await canonical(page)).not.toContain('?');
  });

  test('Elegir un grupo y una opción antepone el grupo al slug', async ({ page }) => {
    expect(deVariosGrupos).toBeDefined();
    const { ficha, gruposFicha, etiquetaGrupo, etiquetaOpcion } = deVariosGrupos!;
    const grupo = gruposFicha[1];
    const opcion = grupo.opciones[1];
    const esperado = `${slug(grupo.nombre)}-${slug(opcion.nombre)}`;
    expect(esperado).not.toBe(`${slug(gruposFicha[0].nombre)}-${slug(gruposFicha[0].opciones[1].nombre)}`);

    await page.goto(`/productos/${ficha.slug}/`);
    await esperarHidratacion(page);
    await elegir(page, etiquetaGrupo, 1);
    await expect
      .poll(() => new URL(page.url()).searchParams.get('opcion'))
      .toBe(`${slug(grupo.nombre)}-${slug(grupo.opciones[0].nombre)}`);
    await elegir(page, etiquetaOpcion, 1);
    await expect.poll(() => new URL(page.url()).searchParams.get('opcion')).toBe(esperado);
    expect(await enlaceDelCta(page)).toBe(opcion.link);

    await page.goto(page.url());
    await esperarHidratacion(page);
    expect(new URL(page.url()).searchParams.get('opcion')).toBe(esperado);
    await expect(page.locator('[data-cta="ver-en-mercado-libre"]')).toHaveAttribute('href', opcion.link);
    await expect(page.locator('main [aria-live="polite"]')).toContainText(opcion.nombre);
  });

  test('Parámetros inexistentes o vacíos dejan el estado por defecto', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (error) => errores.push(error.message));
    const total = muestras.fichas.length;

    for (const consulta of ['', '%20%20']) {
      await page.goto(`/productos/?q=${consulta}`);
      await esperarHidratacion(page);
      await expect(page.locator('main li a[href^="/productos/"]'), `q=${consulta}`).toHaveCount(total);
    }

    await page.goto('/productos/?q=%E0%A4%A');
    await esperarHidratacion(page);
    await expect(page.getByRole('searchbox')).toBeVisible();

    const { ficha, gruposFicha } = deUnGrupo!;
    for (const opcion of ['', 'no-existe', '%E0%A4%A']) {
      await page.goto(`/productos/${ficha.slug}/?opcion=${opcion}`);
      await esperarHidratacion(page);
      await expect(page.locator('[data-cta="ver-en-mercado-libre"]'), `opcion=${opcion}`).toHaveAttribute(
        'href',
        gruposFicha[0].opciones[0].link,
      );
    }
    expect(errores).toEqual([]);
  });
});
