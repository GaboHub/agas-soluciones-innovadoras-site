import { describe, expect, it } from 'vitest';
import { formatearPrecioCLP, leyendaPrecio } from '../../../src/lib/formato';

describe('[sitio] Precio referencial con fecha y sin stock', () => {
  it('Formato del precio', () => {
    expect(formatearPrecioCLP(4490)).toBe('$4.490');
    expect(formatearPrecioCLP(12490)).toBe('$12.490');
    expect(formatearPrecioCLP(1234567)).toBe('$1.234.567');
    expect(leyendaPrecio('2026-10-01')).toBe('Precio referencial al 01-10-2026 — ver precio vigente en Mercado Libre');
  });
});
