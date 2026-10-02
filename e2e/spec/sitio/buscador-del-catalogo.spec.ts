import { expect, test, type Page } from '@playwright/test';
import { esperarHidratacion } from '../_hidratacion';
import site from '../../../src/data/site.json' with { type: 'json' };
import { muestras } from '../_muestras';

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const abrirCatalogo = async (page: Page) => {
  await page.goto('/productos/');
  await esperarHidratacion(page);
};

const buscar = async (page: Page, consulta: string) => {
  await page.getByRole('searchbox').fill(consulta);
};

const slugsListados = async (page: Page) =>
  (await page.locator('main li a[href^="/productos/"]').evaluateAll((enlaces) => enlaces.map((enlace) => enlace.getAttribute('href')!))).map(
    (href) => href.split('/')[2],
  );

const todos = muestras.fichas.map((ficha) => ficha.slug as string);

type Ficha = (typeof muestras.fichas)[number];

const textoBuscable = (ficha: Ficha): string => {
  const categoria = site.categorias.find((candidata) => candidata.slug === ficha.categoria)?.nombre ?? '';
  const variantes = (ficha.variantes as { nombre: string }[] | undefined) ?? [];
  const miembros = (ficha.miembros as { atributos: Record<string, string> }[] | undefined) ?? [];
  const grupos = (ficha.grupos as { diseno: string; colores: { color: string }[] }[] | undefined) ?? [];
  return normalizar(
    [
      ficha.titulo,
      categoria,
      ...variantes.map((variante) => variante.nombre),
      ...miembros.flatMap((miembro) => Object.values(miembro.atributos)),
      ...grupos.flatMap((grupo) => [grupo.diseno, ...grupo.colores.map((color) => color.color)]),
    ].join(' '),
  );
};

const esperadosPara = (consulta: string): string[] => {
  const terminos = normalizar(consulta).split(/\s+/).filter(Boolean);
  return muestras.fichas
    .filter((ficha) => terminos.every((termino) => textoBuscable(ficha).includes(termino)))
    .map((ficha) => ficha.slug as string)
    .sort();
};

const buscarYListar = async (page: Page, consulta: string): Promise<string[]> => {
  await buscar(page, consulta);
  const esperados = esperadosPara(consulta);
  await expect.poll(async () => (await slugsListados(page)).sort()).toEqual(esperados);
  return esperados;
};

const primerColor = muestras.fichas
  .flatMap((ficha) => (ficha.grupos as { colores: { color: string }[] }[] | undefined) ?? [])
  .flatMap((grupo) => grupo.colores.map((color) => color.color))[0];

test.describe('[sitio] Buscador del catálogo', () => {
  test('Sin consulta lista todas las fichas', async ({ page }) => {
    await abrirCatalogo(page);
    expect((await slugsListados(page)).sort()).toEqual([...todos].sort());
  });

  test('Sin tildes ni mayúsculas', async ({ page }) => {
    await abrirCatalogo(page);
    const conLamina = await buscarYListar(page, 'LAMINA');
    expect(conLamina.length).toBeGreaterThan(0);
    expect(conLamina.length).toBeLessThan(todos.length);
    const conTilde = await buscarYListar(page, 'Lámina');
    expect(conTilde).toEqual(conLamina);
  });

  test('Atributo de familia', async ({ page }) => {
    await abrirCatalogo(page);
    const conDiseno = await buscarYListar(page, 'camo urbano');
    expect(conDiseno.length).toBeGreaterThan(0);
    expect(conDiseno.length).toBeLessThan(todos.length);
  });

  test('Categoría y color', async ({ page }) => {
    await abrirCatalogo(page);
    for (const consulta of [site.categorias[0].nombre, site.categorias[site.categorias.length - 1].nombre, primerColor]) {
      const encontrados = await buscarYListar(page, consulta);
      expect(encontrados.length, consulta).toBeGreaterThan(0);
    }
  });

  test('Una consulta con varios términos exige todos', async ({ page }) => {
    await abrirCatalogo(page);
    const lamina = await buscarYListar(page, 'lamina');
    const oled = await buscarYListar(page, 'oled');
    const interseccion = lamina.filter((slug) => oled.includes(slug));
    expect(interseccion.length).toBeGreaterThan(0);
    expect(interseccion.length).toBeLessThan(Math.max(lamina.length, oled.length));
    expect(await buscarYListar(page, 'lamina oled')).toEqual(interseccion);
    expect(await buscarYListar(page, 'oled lamina')).toEqual(interseccion);
  });

  test('Sin resultados', async ({ page }) => {
    await abrirCatalogo(page);
    await buscar(page, 'zzz-no-existe');
    await expect(page.getByText('No encontramos productos para tu búsqueda')).toBeVisible();
    expect(await slugsListados(page)).toEqual([]);
    await page.getByRole('button', { name: 'Ver catálogo completo' }).click();
    await expect(page.getByText('No encontramos productos para tu búsqueda')).toHaveCount(0);
    expect((await slugsListados(page)).sort()).toEqual([...todos].sort());
  });
});
