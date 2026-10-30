import { describe, expect, it } from 'vitest';
import { leyendaPrecio, rotuloPrecio } from '../../src/lib/formato';

describe('rotuloPrecio', () => {
  it('lleva la fecha en DD-MM-AAAA y nada más', () => {
    expect(rotuloPrecio('2026-10-01')).toBe('Precio referencial al 01-10-2026');
  });

  it('es el comienzo de la leyenda completa', () => {
    expect(leyendaPrecio('2026-10-01').startsWith(rotuloPrecio('2026-10-01'))).toBe(true);
  });
});
