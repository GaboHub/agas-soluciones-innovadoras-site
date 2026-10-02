import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { borrar, crearContexto, crearRaizCurada, existe, generar, leerFicha, permalinkDeFixture, type Corrida } from './_arnes';

let contexto: string;
let raiz: string;
let corrida: Corrida;

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  corrida = await generar({ contexto, raiz });
});

afterAll(() => {
  borrar(contexto, raiz);
});

describe('[catalogo] Solo publicaciones activas', () => {
  it('Gemela de catálogo cerrada', () => {
    const ficha = leerFicha(raiz, 'lamina-activa');
    expect(ficha.data.permalink).toBe(permalinkDeFixture('MLC1006-activa-de-cerrada'));
    expect(ficha.data.permalink).not.toBe(permalinkDeFixture('MLC1005-gemela-cerrada'));
    expect(corrida.avisos).toContain('⚠ MLC1005-gemela-cerrada: estado closed, se descarta');
  });

  it('Miembro pausado', () => {
    const ficha = leerFicha(raiz, 'audifonos-fixture');
    const links = (ficha.data.miembros as { link: string }[]).map((miembro) => miembro.link);
    expect(links).toEqual([
      permalinkDeFixture('familia-audifonos-fixture', 'miembro', 'MLC2001'),
      permalinkDeFixture('familia-audifonos-fixture', 'miembro', 'MLC2002'),
      permalinkDeFixture('familia-audifonos-fixture', 'miembro', 'MLC2005'),
      permalinkDeFixture('familia-audifonos-fixture', 'miembro', 'MLC2004'),
      permalinkDeFixture('familia-audifonos-fixture', 'miembro', 'MLC2006'),
    ]);
    expect(corrida.avisos).toContain('⚠ Audifonos Fixture Inalambricos Rosado: estado paused, se descarta');
    expect(JSON.stringify(ficha.data)).not.toContain('MLC-2003');
  });

  it('Publicación suelta cerrada', () => {
    expect(existe(raiz, 'content/productos/cerrada-suelta.md')).toBe(false);
    expect(corrida.avisos).toContain('⚠ MLC1012-cerrada-suelta: estado closed, se descarta');
    expect(corrida.avisos.some((aviso) => aviso.includes('Carpeta sin mapeo explícito: MLC1012'))).toBe(false);
  });

  it('avisa el miembro pausado de una familia sin miembros activos', () => {
    expect(corrida.avisos.some((aviso) => aviso.includes('Familia Vacia Fixture Azul: estado paused'))).toBe(true);
  });

  it('Familia sin miembros activos', () => {
    expect(existe(raiz, 'content/productos/familia-vacia.md')).toBe(false);
    expect(corrida.avisos).toContain('⚠ familia-vacia: familia sin miembros activos, se omite');
  });
});
