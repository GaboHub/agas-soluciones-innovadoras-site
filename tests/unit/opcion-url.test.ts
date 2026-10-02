import { describe, expect, it } from 'vitest';
import { claveOpcion, slugOpcion, ubicarOpcion } from '../../src/lib/opcion-url';

const grupos = [
  { nombre: 'Camo Urbano', opciones: [{ nombre: 'Negro' }, { nombre: 'Rojo Fuego' }] },
  { nombre: 'Azul', opciones: [{ nombre: 'Negro' }, { nombre: 'Verde' }] },
];

describe('slugOpcion', () => {
  it('pasa a minúsculas, quita tildes y une con guiones', () => {
    expect(slugOpcion('Azul y Rojo')).toBe('azul-y-rojo');
    expect(slugOpcion('Fúnda  Cámo / Blanco!')).toBe('funda-camo-blanco');
  });

  it('no deja guiones en los extremos', () => {
    expect(slugOpcion('  -Negro- ')).toBe('negro');
  });
});

describe('claveOpcion', () => {
  it('usa solo la opción cuando la ficha tiene un grupo', () => {
    expect(claveOpcion('Camo Urbano', 'Rojo Fuego', false)).toBe('rojo-fuego');
  });

  it('antepone el grupo cuando la ficha tiene varios', () => {
    expect(claveOpcion('Camo Urbano', 'Rojo Fuego', true)).toBe('camo-urbano-rojo-fuego');
  });
});

describe('ubicarOpcion', () => {
  it('ubica la opción de una ficha con un solo grupo', () => {
    expect(ubicarOpcion([grupos[0]], 'rojo-fuego')).toEqual({ indiceGrupo: 0, indiceOpcion: 1 });
  });

  it('distingue opciones con el mismo nombre en grupos distintos', () => {
    expect(ubicarOpcion(grupos, 'azul-negro')).toEqual({ indiceGrupo: 1, indiceOpcion: 0 });
    expect(ubicarOpcion(grupos, 'camo-urbano-negro')).toEqual({ indiceGrupo: 0, indiceOpcion: 0 });
  });

  it('devuelve null si la clave no existe, es vacía o no llega', () => {
    expect(ubicarOpcion(grupos, 'inexistente')).toBeNull();
    expect(ubicarOpcion(grupos, '')).toBeNull();
    expect(ubicarOpcion(grupos, null)).toBeNull();
    expect(ubicarOpcion(grupos, 'negro')).toBeNull();
  });

  it('no ubica una opción cuyo nombre no deja slug cuando la clave llega vacía', () => {
    expect(ubicarOpcion([{ nombre: 'Estilos', opciones: [{ nombre: '***' }] }], '')).toBeNull();
  });
});
