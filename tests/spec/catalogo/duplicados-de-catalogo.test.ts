import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { borrar, crearContexto, crearRaizCurada, existe, generar, type Corrida } from './_arnes';

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

describe('[catalogo] Duplicados de catálogo', () => {
  it('Par catálogo y no catálogo', () => {
    expect(existe(raiz, 'content/productos/lamina-catalogo.md')).toBe(true);
    expect(existe(raiz, 'content/productos/lamina-gemela.md')).toBe(false);
    expect(corrida.avisos.some((aviso) => aviso.includes('MLC1004-gemela-no-catalogo: duplicada'))).toBe(true);
    expect(corrida.avisos.some((aviso) => aviso.includes('Carpeta sin mapeo explícito: MLC1004'))).toBe(false);
  });

  it('Ninguna de catálogo', () => {
    expect(existe(raiz, 'content/productos/gemela-uno.md')).toBe(true);
    expect(existe(raiz, 'content/productos/gemela-dos.md')).toBe(true);
  });
});
