import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const textosPath = path.resolve(dirname, '../../src/data/textos-productos.json');
const productosDir = path.resolve(dirname, '../../content/productos');

const textos: Record<string, { descripcion: string; metaDescription: string }> = JSON.parse(
  readFileSync(textosPath, 'utf-8'),
);

const archivosProductos = readdirSync(productosDir).filter((archivo) => archivo.endsWith('.md'));
const slugsDeProductos = archivosProductos.map((archivo) => {
  const contenido = readFileSync(path.join(productosDir, archivo), 'utf-8');
  const { data } = matter(contenido);
  return data.slug as string;
});

describe('textos-productos.json', () => {
  it('tiene exactamente las mismas claves que los 22 slugs de productos', () => {
    const claves = Object.keys(textos);
    expect(claves.length).toBe(22);
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
});
