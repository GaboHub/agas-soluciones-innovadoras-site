import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const guiasDir = path.resolve(dirname, '../../content/guias');
const productosDir = path.resolve(dirname, '../../content/productos');

const archivosGuias = readdirSync(guiasDir).filter((archivo) => archivo.endsWith('.md'));
const guias = archivosGuias.map((archivo) => {
  const contenido = readFileSync(path.join(guiasDir, archivo), 'utf-8');
  const { data } = matter(contenido);
  return { archivo, data };
});

const archivosProductos = readdirSync(productosDir).filter((archivo) => archivo.endsWith('.md'));
const slugsDeProductos = archivosProductos.map((archivo) => {
  const contenido = readFileSync(path.join(productosDir, archivo), 'utf-8');
  const { data } = matter(contenido);
  return data.slug as string;
});

const SLUGS_ESPERADOS = [
  'que-lamina-sirve-para-mi-nintendo-switch',
  'diferencias-nintendo-switch-oled-switch-2',
  'como-instalar-lamina-vidrio-sin-burbujas',
  'como-proteger-tu-control-ps5',
];

describe('colección de guías', () => {
  it('hay exactamente 4 guías', () => {
    expect(guias.length).toBe(4);
  });

  it('los 4 slugs esperados existen', () => {
    const slugs = guias.map(({ data }) => data.slug);
    for (const slugEsperado of SLUGS_ESPERADOS) {
      expect(slugs).toContain(slugEsperado);
    }
    expect(new Set(slugs).size).toBe(4);
  });

  it.each(guias)('$archivo tiene los campos requeridos', ({ data }) => {
    expect(typeof data.titulo).toBe('string');
    expect(data.titulo.length).toBeGreaterThan(0);
    expect(typeof data.slug).toBe('string');
    expect(data.slug.length).toBeGreaterThan(0);
    expect(typeof data.descripcion).toBe('string');
    expect(data.descripcion.length).toBeGreaterThan(0);
    expect(typeof data.emoji).toBe('string');
    expect(data.emoji.length).toBeGreaterThan(0);
    expect(Array.isArray(data.productosRelacionados)).toBe(true);
    expect(data.productosRelacionados.length).toBeGreaterThan(0);
  });

  it.each(guias)('$archivo: cada producto relacionado existe en la colección de productos', ({ data }) => {
    for (const slug of data.productosRelacionados) {
      expect(slugsDeProductos).toContain(slug);
    }
  });
});
