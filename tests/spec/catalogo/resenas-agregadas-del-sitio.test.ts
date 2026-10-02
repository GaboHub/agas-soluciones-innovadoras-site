import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { construirResenasJson } from '../../../scripts/generar-catalogo.mjs';
import { borrar, crearContexto, crearRaizCurada, generar, leerFicha, slugsGenerados } from './_arnes';

type Destacada = { productoSlug: string; productoTitulo: string; estrellas: number; titulo: string; texto: string; fecha: string };
type Resenas = {
  mercadolibre: { nivel: string; transacciones: number; url: string };
  promedioGeneral: number;
  totalReviews: number;
  destacadas: Destacada[];
};

let contexto: string;
let raiz: string;
let resenas: Resenas;

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  await generar({ contexto, raiz });
  resenas = JSON.parse(readFileSync(path.join(raiz, 'src/data/resenas.json'), 'utf-8'));
});

afterAll(() => {
  borrar(contexto, raiz);
});

const empresa = { reputacion: { nivel: '5_green', transacciones: 100 }, paginaOficialUrl: 'https://pagina.oficial/x' };

const productoConComentarios = (slug: string, textos: string[], estrellas = 5) => ({
  slug,
  titulo: `Producto ${slug}`,
  reviews: {
    promedio: estrellas,
    cantidad: textos.length,
    distribucion: { [estrellas]: textos.length },
    comentarios: textos.map((texto, indice) => ({ estrellas, titulo: `T${indice}`, texto, fecha: '2031-01-01' })),
  },
});

describe('[catalogo] Reseñas agregadas del sitio', () => {
  it('Reseñas de catálogo excluidas', () => {
    const catalogo = leerFicha(raiz, 'lamina-catalogo').data.reviews as { cantidad: number };
    expect(catalogo.cantidad).toBeGreaterThan(0);
    const propias = slugsGenerados(raiz)
      .filter((slug) => slug !== 'lamina-catalogo')
      .map((slug) => leerFicha(raiz, slug).data.reviews as { promedio: number; cantidad: number } | undefined)
      .filter((reviews) => reviews !== undefined);
    const total = propias.reduce((suma, reviews) => suma + reviews.cantidad, 0);
    const ponderado = propias.reduce((suma, reviews) => suma + reviews.promedio * reviews.cantidad, 0);
    expect(resenas.totalReviews).toBe(total);
    expect(resenas.promedioGeneral).toBe(Number((ponderado / total).toFixed(2)));
    expect(resenas.destacadas.map((destacada) => destacada.productoSlug)).not.toContain('lamina-catalogo');
  });

  it('Una destacada por ficha', () => {
    const deLaFicha = resenas.destacadas.filter((destacada) => destacada.productoSlug === 'tres-cinco');
    expect(deLaFicha).toHaveLength(1);
    expect(deLaFicha[0].texto).toBe('Un comentario bastante más largo que los otros dos de la fixture.');
  });

  it('las destacadas tienen la forma del contrato y salen ordenadas por largo descendente', () => {
    expect(resenas.destacadas.length).toBeGreaterThan(1);
    for (const destacada of resenas.destacadas) {
      expect(Object.keys(destacada).sort()).toEqual(['estrellas', 'fecha', 'productoSlug', 'productoTitulo', 'texto', 'titulo']);
      expect(destacada.estrellas).toBeGreaterThanOrEqual(4);
    }
    const largos = resenas.destacadas.map((destacada) => destacada.texto.length);
    expect(largos).toEqual([...largos].sort((a, b) => b - a));
  });

  it('mercadolibre trae nivel, transacciones y página oficial de empresa.md', () => {
    expect(resenas.mercadolibre).toEqual({
      nivel: '5_green',
      transacciones: 100,
      url: 'https://www.mercadolibre.cl/pagina/tienda_fixture',
    });
  });

  it('a lo más 8 destacadas en total y solo de 4★ o más', () => {
    const productos = Array.from({ length: 10 }, (_, indice) => productoConComentarios(`p${indice}`, ['x'.repeat(indice + 1)]));
    productos.push(productoConComentarios('bajo', ['y'.repeat(50)], 3));
    const resultado = construirResenasJson(productos, empresa);
    expect(resultado.destacadas).toHaveLength(8);
    expect(resultado.destacadas.map((destacada: Destacada) => destacada.productoSlug)).toEqual(
      ['p9', 'p8', 'p7', 'p6', 'p5', 'p4', 'p3', 'p2'],
    );
    expect(resultado.mercadolibre).toEqual({ nivel: '5_green', transacciones: 100, url: 'https://pagina.oficial/x' });
  });
});
