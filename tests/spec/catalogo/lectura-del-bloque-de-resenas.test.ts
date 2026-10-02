import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseReviews } from '../../../scripts/generar-catalogo.mjs';
import { borrar, crearContexto, crearRaizCurada, generar, leerFicha } from './_arnes';

type Comentario = { estrellas: number; titulo: string; texto: string; fecha: string };

let contexto: string;
let raiz: string;

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  await generar({ contexto, raiz });
});

afterAll(() => {
  borrar(contexto, raiz);
});

const bloque = (sufijo: string) =>
  `5.0★ — 1 reviews, 1 con comentario\n\n- 5★: 1\n\n- ★★★★★ «Titulo» — Texto del comentario. (2031-02-04)${sufijo}\n`;

const comentariosDe = (texto: string): Comentario[] => {
  const reseñas = parseReviews(texto);
  expect(reseñas).not.toBeNull();
  return reseñas!.comentarios as Comentario[];
};

describe('[catalogo] Lectura del bloque de reseñas', () => {
  it('Reseñas no disponibles', () => {
    expect(parseReviews('Sin datos de reviews.')).toBeNull();
    expect(parseReviews('Sin reviews aún.')).toBeNull();
    expect(leerFicha(raiz, 'sin-datos').data).not.toHaveProperty('reviews');
    expect(leerFicha(raiz, 'lamina-fixture').data).not.toHaveProperty('reviews');
  });

  it('un miembro de familia con «Sin datos de reviews.» no suma ni rompe la corrida', () => {
    expect(leerFicha(raiz, 'audifonos-fixture').data.reviews).toMatchObject({ cantidad: 2, promedio: 4.5 });
  });

  it('Sufijo de votos', () => {
    for (const sufijo of [' [3 likes, 1 dislikes]', ' [3 likes]', ' [2 dislikes]', ' [1 likes]']) {
      const [comentario] = comentariosDe(bloque(sufijo));
      expect(comentario.texto).toBe('Texto del comentario.');
      expect(comentario.fecha).toBe('2031-02-04');
    }
  });

  it('el texto publicado de las fichas no contiene el sufijo', () => {
    for (const slug of ['audifonos-fixture', 'estuche-variantes', 'replicada-fixture']) {
      const comentarios = (leerFicha(raiz, slug).data.reviews as { comentarios: Comentario[] }).comentarios;
      expect(comentarios.length).toBeGreaterThan(0);
      for (const comentario of comentarios) expect(comentario.texto).not.toMatch(/likes?|dislikes?|\[/);
    }
    const textos = (leerFicha(raiz, 'audifonos-fixture').data.reviews as { comentarios: Comentario[] }).comentarios.map(
      (comentario) => comentario.texto,
    );
    expect(textos).toEqual(['Audio de prueba muy claro.', 'Cumple en la prueba.']);
  });

  it('un comentario sin sufijo conserva su texto', () => {
    const [comentario] = comentariosDe(bloque(''));
    expect(comentario.texto).toBe('Texto del comentario.');
  });
});
