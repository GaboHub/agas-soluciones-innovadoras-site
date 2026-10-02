import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { borrar, crearContexto, crearRaizCurada, generar, leerFicha } from './_arnes';

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

describe('[catalogo] Tipo de ficha', () => {
  it('Suelta con variantes', () => {
    expect(leerFicha(raiz, 'estuche-variantes').data.tipo).toBe('variantes');
  });

  it('una carpeta que empieza con «# Familia:» es familia', () => {
    expect(leerFicha(raiz, 'audifonos-fixture').data.tipo).toBe('familia');
    expect(leerFicha(raiz, 'kit-fundas-fixture').data.tipo).toBe('familia');
  });

  it('el resto es simple', () => {
    expect(leerFicha(raiz, 'lamina-fixture').data.tipo).toBe('simple');
    expect(leerFicha(raiz, 'lampara').data.tipo).toBe('simple');
  });
});
