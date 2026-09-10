import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const textosPath = path.resolve(dirname, '../../src/data/textos-productos.json');
const productosDir = path.resolve(dirname, '../../content/productos');
const catalogoPath = path.resolve(dirname, '../../src/data/catalogo.json');

const textos: Record<string, { descripcion: string; metaDescription: string }> = JSON.parse(
  readFileSync(textosPath, 'utf-8'),
);

const catalogo: { productos: Array<{ slug: string; reviews: { promedio: number; cantidad: number } | null }> } =
  JSON.parse(readFileSync(catalogoPath, 'utf-8'));

const promedioPorSlug = new Map(
  catalogo.productos.map((producto) => [producto.slug, producto.reviews?.promedio ?? null]),
);

const archivosProductos = readdirSync(productosDir).filter((archivo) => archivo.endsWith('.md'));
const slugsDeProductos = archivosProductos.map((archivo) => {
  const contenido = readFileSync(path.join(productosDir, archivo), 'utf-8');
  const { data } = matter(contenido);
  return data.slug as string;
});

describe('textos-productos.json', () => {
  it('tiene exactamente las mismas claves que los 24 slugs de productos', () => {
    const claves = Object.keys(textos);
    expect(claves.length).toBe(24);
    expect(new Set(claves)).toEqual(new Set(slugsDeProductos));
  });

  it.each(Object.entries(textos))('%s tiene descripcion y metaDescription no vacías', (_slug, texto) => {
    expect(typeof texto.descripcion).toBe('string');
    expect(texto.descripcion.length).toBeGreaterThan(0);
    expect(typeof texto.metaDescription).toBe('string');
    expect(texto.metaDescription.length).toBeGreaterThan(0);
  });

  it.each(Object.entries(textos))('%s tiene metaDescription de 160 caracteres o menos', (_slug, texto) => {
    expect(texto.metaDescription.length).toBeLessThanOrEqual(160);
  });

  it.each(Object.entries(textos))(
    '%s no cita un promedio de estrellas (N.N★) desactualizado respecto a catalogo.json',
    (slug, texto) => {
      const patronEstrellas = /(\d+\.\d+)★/g;
      const promedio = promedioPorSlug.get(slug) ?? null;
      for (const campo of [texto.descripcion, texto.metaDescription]) {
        for (const match of campo.matchAll(patronEstrellas)) {
          expect(promedio).not.toBeNull();
          expect(Number(match[1])).toBe(promedio);
        }
      }
    },
  );
});
