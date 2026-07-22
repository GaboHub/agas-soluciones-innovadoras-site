import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const resenasJsonPath = path.resolve(dirname, '../../src/data/resenas.json');
const catalogoJsonPath = path.resolve(dirname, '../../src/data/catalogo.json');

const SLUGS_REVIEWS_CATALOGO_ML = new Set([
  'audifonos-usb-c-manos-libres',
  'pack-2-laminas-vidrio-switch-oled',
  'lamina-vidrio-nintendo-switch',
  'lamina-vidrio-nintendo-switch-2',
]);

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

  it('excluye del pool de destacadas las reviews de publicaciones de catálogo de Mercado Libre', () => {
    const slugsDestacadas = resenas.destacadas.map((resena: { productoSlug: string }) => resena.productoSlug);
    for (const slug of SLUGS_REVIEWS_CATALOGO_ML) {
      expect(slugsDestacadas).not.toContain(slug);
    }
  });

  it('promedioGeneral y totalReviews solo cuentan reviews de publicaciones propias, no de catálogo compartido', () => {
    const catalogo = JSON.parse(readFileSync(catalogoJsonPath, 'utf-8'));
    const productosPropios = catalogo.productos.filter(
      (producto: { slug: string; reviews: { promedio: number; cantidad: number } | null }) =>
        producto.reviews && !SLUGS_REVIEWS_CATALOGO_ML.has(producto.slug),
    );

    const totalReviewsEsperado = productosPropios.reduce(
      (suma: number, producto: { reviews: { cantidad: number } }) => suma + producto.reviews.cantidad,
      0,
    );
    const sumaPonderadaEsperada = productosPropios.reduce(
      (suma: number, producto: { reviews: { promedio: number; cantidad: number } }) =>
        suma + producto.reviews.promedio * producto.reviews.cantidad,
      0,
    );
    const promedioEsperado = Number((sumaPonderadaEsperada / totalReviewsEsperado).toFixed(2));

    expect(resenas.totalReviews).toBe(totalReviewsEsperado);
    expect(resenas.promedioGeneral).toBe(promedioEsperado);
    expect(resenas.totalReviews).toBe(26);
    expect(resenas.promedioGeneral).toBe(4.78);
  });
});
