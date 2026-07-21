import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const resenasJsonPath = path.resolve(dirname, '../../src/data/resenas.json');

describe('resenas.json contenido', () => {
  const resenas = JSON.parse(readFileSync(resenasJsonPath, 'utf-8'));

  it('tiene la reputación de Mercado Libre', () => {
    expect(resenas.mercadolibre.nivel).toBe('5_green');
    expect(resenas.mercadolibre.transacciones).toBeGreaterThan(0);
    expect(resenas.mercadolibre.url).toMatch(/^https:\/\/www\.mercadolibre\.cl\//);
  });

  it('tiene promedio general entre 1 y 5 y total de reviews positivo', () => {
    expect(resenas.promedioGeneral).toBeGreaterThanOrEqual(1);
    expect(resenas.promedioGeneral).toBeLessThanOrEqual(5);
    expect(resenas.totalReviews).toBeGreaterThan(0);
  });

  it('tiene reseñas destacadas con producto, estrellas 1..5 y texto', () => {
    expect(Array.isArray(resenas.destacadas)).toBe(true);
    expect(resenas.destacadas.length).toBeGreaterThan(0);
    for (const resena of resenas.destacadas) {
      expect(typeof resena.productoSlug).toBe('string');
      expect(resena.productoSlug.length).toBeGreaterThan(0);
      expect(typeof resena.productoTitulo).toBe('string');
      expect(resena.productoTitulo.length).toBeGreaterThan(0);
      expect(resena.estrellas).toBeGreaterThanOrEqual(1);
      expect(resena.estrellas).toBeLessThanOrEqual(5);
      expect(typeof resena.texto).toBe('string');
      expect(resena.texto.length).toBeGreaterThan(0);
    }
  });

  it('no repite productos entre las destacadas', () => {
    const slugs = resenas.destacadas.map((resena: { productoSlug: string }) => resena.productoSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('no conserva las claves compat de la plantilla', () => {
    expect(resenas.google).toBeUndefined();
    expect(resenas.resenas).toBeUndefined();
  });
});
