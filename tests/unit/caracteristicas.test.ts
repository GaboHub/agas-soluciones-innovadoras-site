import { describe, expect, it } from 'vitest';
import { separarRotulo } from '../../src/lib/caracteristicas';

describe('separarRotulo', () => {
  it('toma como rótulo lo anterior al primer «: » y lo incluye con los dos puntos', () => {
    expect(separarRotulo('Compatibilidad Exclusiva: Fabricada para la Switch 2. No sirve en otras.')).toEqual({
      rotulo: 'Compatibilidad Exclusiva:',
      resto: ' Fabricada para la Switch 2. No sirve en otras.',
    });
  });

  it('usa solo el primer «: »', () => {
    expect(separarRotulo('Material: silicona: suave')).toEqual({ rotulo: 'Material:', resto: ' silicona: suave' });
  });

  it('acepta un rótulo de hasta 8 palabras', () => {
    expect(separarRotulo('uno dos tres cuatro cinco seis siete ocho: texto')?.rotulo).toBe(
      'uno dos tres cuatro cinco seis siete ocho:',
    );
  });

  it('descarta un prefijo de más de 8 palabras', () => {
    expect(separarRotulo('uno dos tres cuatro cinco seis siete ocho nueve: texto')).toBeNull();
  });

  it('descarta un prefijo con punto', () => {
    expect(separarRotulo('Es resistente. Además: dura mucho')).toBeNull();
  });

  it('acepta un punto decimal en el rótulo', () => {
    expect(separarRotulo('Conectividad Bluetooth 5.4: Transmisión estable.')).toEqual({
      rotulo: 'Conectividad Bluetooth 5.4:',
      resto: ' Transmisión estable.',
    });
  });

  it('descarta un prefijo con un punto al final', () => {
    expect(separarRotulo('Listo.: texto')).toBeNull();
  });

  it('deja igual un ítem sin «: »', () => {
    expect(separarRotulo('Silicona suave al tacto')).toBeNull();
    expect(separarRotulo('Hora 12:30 de despacho')).toBeNull();
  });

  it('deja igual un ítem sin texto después del rótulo o sin rótulo antes de los dos puntos', () => {
    expect(separarRotulo('Material: ')).toBeNull();
    expect(separarRotulo(': texto')).toBeNull();
  });
});
