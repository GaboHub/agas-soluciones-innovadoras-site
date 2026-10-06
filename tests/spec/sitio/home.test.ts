import { describe, expect, it, vi } from 'vitest';

vi.mock('astro:content', () => ({ getCollection: async () => [] }));

const { ordenarPorResenas } = await import('../../../src/lib/productos');

const ficha = (slug: string, cantidad: number, promedio: number) => ({ data: { slug, reviews: { cantidad, promedio } } });
const slugs = (fichas: { data: { slug: string } }[]) => fichas.map((entrada) => entrada.data.slug);

describe('[sitio] Home', () => {
  it('Más reseñadas', () => {
    const entrada = [ficha('a', 3, 5), ficha('b', 20, 4.9), ficha('c', 10, 4.9), ficha('d', 28, 4.7)];
    expect(slugs(ordenarPorResenas(entrada, 4))).toEqual(['d', 'b', 'c', 'a']);
    expect(slugs(ordenarPorResenas(entrada, 2))).toEqual(['d', 'b']);
  });

  it('Más reseñadas descarta las fichas sin reseñas', () => {
    const entrada = [{ data: { slug: 'x', reviews: null } }, { data: { slug: 'y' } }, ficha('z', 0, 0), ficha('w', 1, 4)];
    expect(slugs(ordenarPorResenas(entrada, 4))).toEqual(['w']);
  });

  it('Empate en cantidad de reseñas', () => {
    const entrada = [ficha('estuche', 9, 4.8), ficha('grips', 9, 4.9), ficha('kit', 9, 5)];
    expect(slugs(ordenarPorResenas(entrada, 3))).toEqual(['kit', 'grips', 'estuche']);
    expect(slugs(ordenarPorResenas([...entrada].reverse(), 3))).toEqual(['kit', 'grips', 'estuche']);
  });

  it('Empate en cantidad y promedio de reseñas se resuelve por slug ascendente', () => {
    const entrada = [ficha('c', 9, 4.9), ficha('a', 9, 4.9), ficha('b', 9, 4.9)];
    expect(slugs(ordenarPorResenas(entrada, 3))).toEqual(['a', 'b', 'c']);
    expect(slugs(ordenarPorResenas([...entrada].reverse(), 3))).toEqual(['a', 'b', 'c']);
  });
});
