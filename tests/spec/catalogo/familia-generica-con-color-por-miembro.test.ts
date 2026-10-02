import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  borrar,
  comprobarImagenesDeMiembro,
  crearContexto,
  crearRaizCurada,
  generar,
  generarAparte,
  leerFicha,
  permalinkDeFixture,
} from './_arnes';

type Miembro = {
  titulo: string;
  link: string;
  precio: number;
  imagenes: string[];
  atributos: Record<string, string>;
};

let contexto: string;
let raiz: string;
let miembros: Miembro[];

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  await generar({ contexto, raiz });
  miembros = leerFicha(raiz, 'audifonos-fixture').data.miembros as Miembro[];
});

afterAll(() => {
  borrar(contexto, raiz);
});

const porItem = (item: string) =>
  miembros.find((miembro) => miembro.link === permalinkDeFixture('familia-audifonos-fixture', 'miembro', item));

describe('[catalogo] Familia genérica con color por miembro', () => {
  it('Color declarado', () => {
    expect(porItem('MLC2001')?.atributos).toEqual({ color: 'Azul Mapeado' });
  });

  it('sin declaración el color es la última palabra del título', async () => {
    const sinColores = await generarAparte(
      [{ prefijo: 'familia-audifonos-fixture', slug: 'audifonos-sin-mapa', titulo: 'Audífonos Fixture Inalámbricos' }],
      contexto,
    );
    const azul = (sinColores.ficha('audifonos-sin-mapa').data.miembros as Miembro[])[0];
    expect(azul.atributos.color).toBe('Azul');
  });

  it('el resto del sufijo es el diseño', () => {
    expect(porItem('MLC2005')?.atributos).toEqual({ color: 'Dorado', diseno: 'Edicion Especial' });
  });

  it('un sufijo de una sola palabra que es color da diseño igual al color', () => {
    expect(porItem('MLC2002')?.atributos).toEqual({ color: 'Blanco', diseno: 'Blanco' });
  });

  it('emite un miembro por miembro activo con título, link, precio propio e imágenes', async () => {
    expect(miembros.map((miembro) => [miembro.titulo.split(' ').slice(3).join(' '), miembro.precio])).toEqual([
      ['Azul', 7990],
      ['Blanco', 8990],
      ['Edicion Especial Dorado', 9990],
      ['Negro', 6990],
      ['Verde', 5990],
    ]);
    for (const miembro of miembros) {
      const { declaradas, generadas, esperadas } = await comprobarImagenesDeMiembro({
        contexto,
        raiz,
        carpeta: 'familia-audifonos-fixture',
        link: miembro.link,
        imagenes: miembro.imagenes,
      });
      expect(declaradas, miembro.link).toHaveLength(2);
      expect(generadas, miembro.link).toHaveLength(2);
      for (const [posicion, generada] of generadas.entries()) {
        expect(generada.equals(esperadas[posicion]), `${miembro.titulo} imagen ${posicion + 1}`).toBe(true);
      }
    }
  });
});
