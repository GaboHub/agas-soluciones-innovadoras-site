import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import site from '../../../src/data/site.json' with { type: 'json' };
import { muestras } from '../_muestras';

const clp = (valor: number) => `$${valor.toLocaleString('es-CL')}`;
const fecha = (iso: string) => iso.split('-').reverse().join('-');
const lineasDeCatalogo = (texto: string) => texto.split('\n').filter((linea) => linea.startsWith('- [') && linea.includes('/productos/'));

test.describe('[seo-geo] llms.txt construido con el sitio', () => {
  test('Una línea por ficha', async ({ request }) => {
    const respuesta = await request.get('/llms.txt');
    expect(respuesta.status()).toBe(200);
    expect(respuesta.headers()['content-type']).toMatch(/text\/plain/);
    const texto = await respuesta.text();
    const lineas = lineasDeCatalogo(texto);
    expect(lineas).toHaveLength(muestras.fichas.length);
    for (const ficha of muestras.fichas) {
      const linea = lineas.filter((candidata) => candidata.includes(`https://agassoluciones.cl/productos/${ficha.slug}/`));
      expect(linea).toEqual([
        `- [${ficha.titulo}](https://agassoluciones.cl/productos/${ficha.slug}/): precio referencial ${clp(ficha.precioReferencial)} al ${fecha(ficha.fechaPrecio)}; en Mercado Libre: ${ficha.permalink}`,
      ]);
    }
    const encabezados = texto.split('\n').filter((linea) => linea.startsWith('### '));
    expect(encabezados).toEqual(site.categorias.map((categoria) => `### ${categoria.nombre}`));
  });

  test('Datos de cabecera', async ({ request }) => {
    const texto = await (await request.get('/llms.txt')).text();
    const lineas = texto.split('\n');
    expect(lineas[0]).toBe(`# ${site.nombre}`);
    expect(lineas[2]).toBe(`> ${site.descripcion}`);
    expect(texto).toContain(`Tienda en Mercado Libre: ${site.mercadolibre.tienda}\n`);
    expect(texto).toContain(`Página oficial en Mercado Libre: ${site.mercadolibre.paginaOficial}\n`);
  });

  test('Sin guías: con guías, la sección las lista por título', async ({ request }) => {
    const texto = await (await request.get('/llms.txt')).text();
    expect(muestras.guias.length).toBeGreaterThan(0);
    expect(texto).toContain('## Guías');
    const seccion = texto.split('## Guías')[1].split('## ')[0];
    const titulos = [...seccion.matchAll(/^- \[(.+?)\]\(https:\/\/agassoluciones\.cl\/guias\/.+?\): /gm)].map((m) => m[1]);
    expect(titulos).toEqual(muestras.guias.map((guia) => guia.titulo).sort((a, b) => a.localeCompare(b)));
  });

  test('el build publica la regla de Content-Type utf-8 para /llms.txt', async () => {
    const reglas = readFileSync(path.resolve(import.meta.dirname, '../../../dist/_headers'), 'utf-8');
    const bloque = reglas.split(/\n(?=\S)/).find((candidato) => candidato.split('\n')[0].trim() === '/llms.txt');
    expect(bloque).toBeDefined();
    expect(bloque).toMatch(/^\s+Content-Type: text\/plain; charset=utf-8$/m);
  });
});
