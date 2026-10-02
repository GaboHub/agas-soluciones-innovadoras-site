import { describe, expect, it } from 'vitest';
import { publicables } from '../../../src/lib/promociones';

const item = (id: string, desde: string, hasta: string) => ({ id, desde, hasta });

describe('[promociones] Publicables y orden', () => {
  it('Todo vencido', () => {
    const items = [item('a', '2031-01-01', '2031-01-31'), item('b', '2031-02-01', '2031-02-28')];
    expect(publicables(items, '2031-03-01')).toEqual([]);
  });

  it('Vigente antes que próxima', () => {
    const items = [item('proxima-temprana', '2031-04-01', '2031-04-30'), item('vigente-tardia', '2031-03-15', '2031-05-31')];
    const resultado = publicables(items, '2031-03-20');
    expect(resultado.map((entrada) => entrada.id)).toEqual(['vigente-tardia', 'proxima-temprana']);
    expect(resultado.map((entrada) => entrada.estado)).toEqual(['vigente', 'proxima']);
  });

  it('cada grupo se ordena por desde ascendente', () => {
    const items = [
      item('proxima-tardia', '2031-06-01', '2031-06-30'),
      item('vigente-tardia', '2031-03-10', '2031-04-30'),
      item('proxima-temprana', '2031-05-01', '2031-05-31'),
      item('vigente-temprana', '2031-03-01', '2031-04-30'),
    ];
    expect(publicables(items, '2031-03-15').map((entrada) => entrada.id)).toEqual([
      'vigente-temprana',
      'vigente-tardia',
      'proxima-temprana',
      'proxima-tardia',
    ]);
  });
});
