import { describe, expect, it } from 'vitest';
import textos from '../../../src/data/textos-productos.json';
import { muestras } from '../../../e2e/spec/_muestras';
import { citasInventadas, fichasSinTexto, textosSinFicha } from './_textos';

const fichas = muestras.fichas as { slug: string; reviews?: { promedio: number; cantidad: number } }[];

const texto = (descripcion: string, metaDescription = 'Meta de prueba') => ({ descripcion, metaDescription });

describe('[seo-geo] Descripción propia de cada ficha', () => {
  it('Ficha sin texto propio', () => {
    expect(fichas.length).toBeGreaterThan(0);
    expect(fichasSinTexto(fichas, textos)).toEqual([]);
    expect(textosSinFicha(fichas, textos)).toEqual([]);
    expect(fichasSinTexto([{ slug: 'uno' }, { slug: 'dos' }], { uno: texto('Uno') })).toEqual(['dos']);
    expect(textosSinFicha([{ slug: 'uno' }], { uno: texto('Uno'), dos: texto('Dos') })).toEqual(['dos']);
  });

  it('cada metaDescription tiene entre 1 y 160 caracteres', () => {
    for (const ficha of fichas) {
      const { metaDescription, descripcion } = (textos as Record<string, ReturnType<typeof texto>>)[ficha.slug];
      expect(metaDescription.length, ficha.slug).toBeGreaterThan(0);
      expect(metaDescription.length, ficha.slug).toBeLessThanOrEqual(160);
      expect(descripcion.length, ficha.slug).toBeGreaterThan(0);
    }
  });

  it('Estrellas inventadas', () => {
    expect(citasInventadas(fichas, textos)).toEqual([]);
    const conResenas = { slug: 'a', reviews: { promedio: 4.7, cantidad: 12 } };
    expect(citasInventadas([conResenas], { a: texto('Con 4.9★ en Mercado Libre') })).toHaveLength(1);
    expect(citasInventadas([{ slug: 'a' }], { a: texto('Con 4.9★ en Mercado Libre') })).toHaveLength(1);
    expect(citasInventadas([conResenas], { a: texto('Calificado 4.7★ por compradores') })).toEqual([]);
    expect(citasInventadas([conResenas], { a: texto('x', 'Con 4.9★') })).toHaveLength(1);
    expect(citasInventadas([conResenas], { a: texto('Tiene 30 reseñas') })).toHaveLength(1);
    expect(citasInventadas([conResenas], { a: texto('Tiene 12 reseñas') })).toEqual([]);
  });

  it('Estrellas inventadas: la cantidad con separador de miles se lee completa', () => {
    const muchas = { slug: 'a', reviews: { promedio: 4.7, cantidad: 1004 } };
    expect(citasInventadas([muchas], { a: texto('Con 1.004 reseñas') })).toEqual([]);
    expect(citasInventadas([muchas], { a: texto('Con 1,004 reseñas') })).toEqual([]);
    expect(citasInventadas([muchas], { a: texto('Con 1004 reseñas') })).toEqual([]);
    expect(citasInventadas([muchas], { a: texto('Con 1.040 reseñas') })).toHaveLength(1);
    expect(citasInventadas([muchas], { a: texto('Con 2.004 reseñas') })).toHaveLength(1);
    const pocas = { slug: 'a', reviews: { promedio: 4.7, cantidad: 4 } };
    expect(citasInventadas([pocas], { a: texto('Con 1.004 reseñas') })).toHaveLength(1);
    expect(citasInventadas([pocas], { a: texto('Con 4 reseñas') })).toEqual([]);
  });
});
