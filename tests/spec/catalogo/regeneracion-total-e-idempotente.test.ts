import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { borrar, crearContexto, crearRaizCurada, existe, generar, hashDeArbol } from './_arnes';

const SALIDAS = ['content/productos', 'src/assets/images/productos', 'src/data/resenas.json'];

let contexto: string;
let raiz: string;
let curadosAntes: string;
let barridoAntes: string;
let tras1: string;

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  curadosAntes = hashDeArbol(raiz, SALIDAS);
  barridoAntes = hashDeArbol(contexto);
  await generar({ contexto, raiz });
  tras1 = hashDeArbol(raiz);
});

afterAll(() => {
  borrar(contexto, raiz);
});

describe('[catalogo] Regeneración total e idempotente', () => {
  it('Ficha huérfana', () => {
    expect(existe(raiz, 'content/productos/huerfano.md')).toBe(false);
    expect(existe(raiz, 'src/assets/images/productos/huerfano')).toBe(false);
    expect(existe(raiz, 'content/productos/lamina-fixture.md')).toBe(true);
  });

  it('Dos corridas iguales', async () => {
    await generar({ contexto, raiz });
    expect(hashDeArbol(raiz)).toBe(tras1);
  });

  it('Archivos curados intactos', () => {
    expect(hashDeArbol(raiz, SALIDAS)).toBe(curadosAntes);
    expect(hashDeArbol(contexto)).toBe(barridoAntes);
  });

  it('sobrescribe resenas.json y no escribe catalogo.json', () => {
    expect(readFileSync(path.join(raiz, 'src/data/resenas.json'), 'utf-8')).not.toContain('antiguo');
    expect(existe(raiz, 'src/data/catalogo.json')).toBe(false);
    expect(existe(raiz, 'public/llms.txt')).toBe(false);
  });
});
