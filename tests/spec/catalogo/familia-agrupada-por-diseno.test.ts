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

type Grupo = { diseno: string; colores: { color: string; link: string; imagenes: string[] }[] };

let contexto: string;
let raiz: string;
let grupos: Grupo[];
let datos: Record<string, unknown>;

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  await generar({ contexto, raiz });
  const ficha = leerFicha(raiz, 'kit-fundas-fixture');
  datos = ficha.data;
  grupos = ficha.data.grupos as Grupo[];
});

afterAll(() => {
  borrar(contexto, raiz);
});

const entradaAgrupada = { prefijo: 'familia-kit-fundas-fixture', slug: 'kit-con-etiquetas', titulo: 'Kit Fundas Fixture Diseños Control PS5', agruparPorDiseno: true };

describe('[catalogo] Familia agrupada por diseño', () => {
  it('Diseño y color', () => {
    const blanco = grupos.find((grupo) => grupo.diseno === 'Blanco');
    expect(blanco?.colores.map((color) => color.color)).toEqual(['Gris']);
    expect(blanco?.colores[0].link).toBe(permalinkDeFixture('familia-kit-fundas-fixture', 'miembro', 'MLC3004'));
  });

  it('un sufijo de una sola palabra que es color da diseño igual al color', () => {
    const azul = grupos.find((grupo) => grupo.diseno === 'Azul');
    expect(azul?.colores.map((color) => color.color)).toEqual(['Azul']);
  });

  it('los grupos van en orden de aparición y agrupan los colores de cada diseño', () => {
    expect(grupos.map((grupo) => [grupo.diseno, grupo.colores.map((color) => color.color)])).toEqual([
      ['Camo', ['Negro', 'Rojo']],
      ['Lunar', ['Negro']],
      ['Blanco', ['Gris']],
      ['Azul', ['Azul']],
    ]);
  });

  it('cada color trae las imágenes que la fixture declara para su miembro', async () => {
    for (const grupo of grupos) {
      for (const color of grupo.colores) {
        const { declaradas, generadas, esperadas } = await comprobarImagenesDeMiembro({
          contexto,
          raiz,
          carpeta: 'familia-kit-fundas-fixture',
          link: color.link,
          imagenes: color.imagenes,
        });
        expect(declaradas, color.link).toHaveLength(2);
        expect(generadas, color.link).toHaveLength(2);
        for (const [posicion, generada] of generadas.entries()) {
          expect(generada.equals(esperadas[posicion]), `${grupo.diseno} ${color.color} imagen ${posicion + 1}`).toBe(true);
        }
      }
    }
  });

  it('Etiquetas declaradas', async () => {
    const conEtiquetas = await generarAparte(
      [{ ...entradaAgrupada, etiquetas: { grupo: 'Funda', opcion: 'Grips' } }],
      contexto,
    );
    expect(conEtiquetas.ficha('kit-con-etiquetas').data).toMatchObject({ etiquetaGrupo: 'Funda', etiquetaOpcion: 'Grips' });
    expect(datos).not.toHaveProperty('etiquetaGrupo');
    expect(datos).not.toHaveProperty('etiquetaOpcion');
  });

  it('la ficha no lleva reviews aunque un miembro las tenga', () => {
    expect(datos).not.toHaveProperty('reviews');
  });
});
