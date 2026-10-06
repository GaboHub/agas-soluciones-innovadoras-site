import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const resenasJsonPath = path.resolve(dirname, '../../src/data/resenas.json');
const productosDir = path.resolve(dirname, '../../content/productos');

const SLUGS_REVIEWS_CATALOGO_ML = new Set([
  'pack-2-laminas-vidrio-switch-oled',
  'lamina-vidrio-nintendo-switch',
  'lamina-vidrio-nintendo-switch-2',
  'pack-3-laminas-vidrio-switch-2',
]);

type Ficha = { slug: string; reviews: { promedio: number; cantidad: number } | null };

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
    const fichas = readdirSync(productosDir)
      .filter((archivo) => archivo.endsWith('.md'))
      .map((archivo) => matter(readFileSync(path.join(productosDir, archivo), 'utf-8')).data as Ficha);
    const productosPropios = fichas.filter(
      (producto): producto is Ficha & { reviews: NonNullable<Ficha['reviews']> } =>
        Boolean(producto.reviews) && !SLUGS_REVIEWS_CATALOGO_ML.has(producto.slug),
    );

    const totalReviewsEsperado = productosPropios.reduce((suma, producto) => suma + producto.reviews.cantidad, 0);
    const sumaPonderadaEsperada = productosPropios.reduce(
      (suma, producto) => suma + producto.reviews.promedio * producto.reviews.cantidad,
      0,
    );
    const promedioEsperado = Number((sumaPonderadaEsperada / totalReviewsEsperado).toFixed(2));

    expect(resenas.totalReviews).toBe(totalReviewsEsperado);
    expect(resenas.promedioGeneral).toBe(promedioEsperado);
    expect(resenas.totalReviews).toBe(42);
    expect(resenas.promedioGeneral).toBe(4.82);
  });
});
