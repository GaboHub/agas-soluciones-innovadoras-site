import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asignarCategoria, REGLAS_CATEGORIA } from '../../../scripts/generar-catalogo.mjs';
import { borrar, crearContexto, crearRaizCurada, generar, leerFicha, type Corrida } from './_arnes';

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

describe('[catalogo] Categoría por reglas', () => {
  it('Audio antes que consola', () => {
    expect(asignarCategoria('Audífonos para control PS5')).toBe('audio');
    expect(asignarCategoria('Manos libres para Switch')).toBe('audio');
  });

  it('Sin regla', () => {
    expect(asignarCategoria('Lámpara')).toBe('otros');
    expect(leerFicha(raiz, 'lampara').data.categoria).toBe('otros');
    expect(corrida.avisos).toContain('⚠ lampara: no matcheó ninguna regla de categoría, quedó en "otros"');
  });

  it('PlayStation antes que Nintendo Switch', () => {
    expect(asignarCategoria('Control PS5 para Switch')).toBe('playstation-5');
    expect(asignarCategoria('Estuche Nintendo Switch')).toBe('nintendo-switch');
  });

  it('el orden de las reglas es audio, playstation-5, nintendo-switch', () => {
    expect(REGLAS_CATEGORIA.map((regla: { categoria: string }) => regla.categoria)).toEqual([
      'audio',
      'playstation-5',
      'nintendo-switch',
    ]);
  });

  it('las fichas generadas llevan la categoría de su regla', () => {
    expect(leerFicha(raiz, 'audifonos-fixture').data.categoria).toBe('audio');
    expect(leerFicha(raiz, 'kit-fundas-fixture').data.categoria).toBe('playstation-5');
    expect(leerFicha(raiz, 'lamina-fixture').data.categoria).toBe('nintendo-switch');
  });

  it('una ficha con categoría asignada no avisa', () => {
    expect(corrida.avisos.some((aviso) => aviso.startsWith('⚠ lamina-fixture: no matcheó'))).toBe(false);
  });
});
