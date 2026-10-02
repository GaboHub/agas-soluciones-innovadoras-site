import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import path from 'node:path';
import { borrar, crearContexto, crearRaizCurada, FIXTURE_BARRIDO, generar, leerFicha, permalinkDeFixture } from './_arnes';

type Variante = { nombre: string; atributo: string; link: string; imagenes: string[] };

let contexto: string;
let raiz: string;
let variantes: Variante[];
let imagenesFicha: string[];
const permalink = permalinkDeFixture('MLC1002-estuche-variantes');

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  await generar({ contexto, raiz });
  const ficha = leerFicha(raiz, 'estuche-variantes');
  variantes = ficha.data.variantes as Variante[];
  imagenesFicha = ficha.data.imagenes as string[];
});

afterAll(() => {
  borrar(contexto, raiz);
});

describe('[catalogo] Variantes con deep-link', () => {
  it('Variante con id', () => {
    const rojo = variantes.find((variante) => variante.nombre === 'Rojo');
    expect(rojo).toMatchObject({ nombre: 'Rojo', atributo: 'Color', link: `${permalink}?variation=123` });
  });

  it('une valores y claves de varios atributos con « / »', () => {
    const verde = variantes.find((variante) => variante.nombre === 'Verde / M');
    expect(verde).toMatchObject({ atributo: 'Color / Talla', link: `${permalink}?variation=789` });
  });

  it('sin id en la carpeta el link es el permalink', () => {
    const sinId = variantes.find((variante) => variante.nombre === 'Sin Id');
    expect(sinId?.link).toBe(permalink);
  });

  it('una variante por fila de la tabla, en orden', () => {
    expect(variantes.map((variante) => variante.nombre)).toEqual(['Rojo', 'Azul', 'Verde / M', 'Sin Id']);
  });

  it('las imágenes de cada variante son las que la fixture declara para su fila', async () => {
    const texto = readFileSync(path.join(FIXTURE_BARRIDO, 'publicaciones/MLC1002-estuche-variantes/publicacion.md'), 'utf-8');
    const filas = ['Color: Rojo', 'Color: Azul', 'Color: Verde · Talla: M', 'Color: Sin Id'];
    for (const [indice, fila] of filas.entries()) {
      const declaradas = [...texto.matchAll(new RegExp(`\\*\\*${fila}\\*\\*\\n\\n((?:- .+\\n?)+)`, 'g'))]
        .flatMap((coincidencia) => coincidencia[1].split('\n'))
        .filter((linea) => linea.startsWith('- '))
        .map((linea) => linea.slice(2).trim());
      expect(declaradas, fila).toHaveLength(2);
      for (const [posicion, relativa] of declaradas.entries()) {
        const fuente = path.join(contexto, 'publicaciones/MLC1002-estuche-variantes', relativa);
        const esperado = await sharp(fuente).resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        const generada = readFileSync(path.join(raiz, 'src/assets/images', variantes[indice].imagenes[posicion]));
        expect(generada.equals(esperado), `${fila} imagen ${posicion + 1}`).toBe(true);
      }
    }
  });

  it('cada variante trae imágenes propias y la ficha las concatena', () => {
    for (const variante of variantes) {
      expect(variante.imagenes).toHaveLength(2);
      for (const imagen of variante.imagenes) {
        expect(existsSync(path.join(raiz, 'src/assets/images', imagen))).toBe(true);
      }
    }
    expect(new Set(variantes.flatMap((variante) => variante.imagenes)).size).toBe(8);
    expect(imagenesFicha).toEqual(variantes.flatMap((variante) => variante.imagenes));
  });
});
