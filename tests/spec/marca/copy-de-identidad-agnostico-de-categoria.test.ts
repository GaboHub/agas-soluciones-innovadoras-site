import { describe, expect, it } from 'vitest';
import site from '../../../src/data/site.json' with { type: 'json' };

interface Identidad {
  tagline: string;
  descripcion: string;
  hero: { titulo: string; bajada: string };
}

const TERMINOS_PROHIBIDOS = ['accesorios tech', 'tienda de accesorios de tecnología'];

const camposDeIdentidad = ({ tagline, descripcion, hero }: Identidad): Record<string, string> => ({
  tagline,
  descripcion,
  'hero.titulo': hero.titulo,
  'hero.bajada': hero.bajada,
});

const contiene = (texto: string, termino: string): boolean => texto.toLowerCase().includes(termino.toLowerCase());

const sinMarcadorTemporal = (campos: Record<string, string>): string[] =>
  ['descripcion', 'hero.bajada'].filter((campo) => !/\bhoy\b/i.test(campos[campo]));

const conRubroFijo = (campos: Record<string, string>): string[] =>
  Object.entries(campos)
    .filter(([, texto]) => TERMINOS_PROHIBIDOS.some((termino) => contiene(texto, termino)))
    .map(([campo]) => campo);

describe('[marca] Copy de identidad agnóstico de categoría', () => {
  it('Marcador temporal', () => {
    const campos = camposDeIdentidad(site);
    expect(Object.keys(campos)).toHaveLength(4);
    for (const texto of Object.values(campos)) expect(texto.length).toBeGreaterThan(0);
    expect(sinMarcadorTemporal(campos)).toEqual([]);
    expect(conRubroFijo(campos)).toEqual([]);
  });

  it('el detector encuentra la falta del marcador y los términos de rubro fijo', () => {
    const campos = camposDeIdentidad({
      tagline: 'Tu Tienda de Accesorios de Tecnología',
      descripcion: 'Elegimos accesorios tech para ti.',
      hero: { titulo: 'Hoy y mañana', bajada: 'Hoy elegimos con criterio, mañana también.' },
    });
    expect(sinMarcadorTemporal(campos)).toEqual(['descripcion']);
    expect(conRubroFijo(campos)).toEqual(['tagline', 'descripcion']);
    expect(sinMarcadorTemporal({ descripcion: 'Un día hoy.', 'hero.bajada': 'hoy' })).toEqual([]);
    expect(sinMarcadorTemporal({ descripcion: 'chohoy', 'hero.bajada': 'hoyuelo' })).toEqual(['descripcion', 'hero.bajada']);
  });
});
