import { describe, expect, it } from 'vitest';
import { clasificar } from '../../../src/lib/promociones';

const promo = { desde: '2031-03-10', hasta: '2031-03-20' };

describe('[promociones] Vigencia inclusiva en fecha de Chile', () => {
  it('Primer día', () => {
    expect(clasificar(promo, '2031-03-10')).toBe('vigente');
  });

  it('Último día', () => {
    expect(clasificar(promo, '2031-03-20')).toBe('vigente');
  });

  it('Día siguiente al cierre', () => {
    expect(clasificar(promo, '2031-03-21')).toBe('expirada');
  });

  it('Día anterior al inicio', () => {
    expect(clasificar(promo, '2031-03-09')).toBe('proxima');
  });
});
