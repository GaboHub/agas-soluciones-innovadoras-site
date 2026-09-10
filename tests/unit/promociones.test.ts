import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { clasificar, getCampanasPublicables, getCuponesPublicables, hoyEnChile } from '../../src/lib/promociones';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const promocionesJsonPath = path.resolve(dirname, '../../src/data/promociones.json');
const promociones = JSON.parse(readFileSync(promocionesJsonPath, 'utf-8'));

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

describe('promociones.json contenido', () => {
  it('tiene aclaracion no vacía', () => {
    expect(typeof promociones.aclaracion).toBe('string');
    expect(promociones.aclaracion.length).toBeGreaterThan(0);
  });

  it('tiene al menos un cupón y una campaña', () => {
    expect(Array.isArray(promociones.cupones)).toBe(true);
    expect(promociones.cupones.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(promociones.campanas)).toBe(true);
    expect(promociones.campanas.length).toBeGreaterThanOrEqual(1);
  });

  it('los ids de cupones son únicos', () => {
    const ids = promociones.cupones.map((cupon: { id: string }) => cupon.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los ids de campañas son únicos', () => {
    const ids = promociones.campanas.map((campana: { id: string }) => campana.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada cupón tiene porcentaje entero entre 1 y 99, condición y nombre no vacíos', () => {
    for (const cupon of promociones.cupones) {
      expect(Number.isInteger(cupon.porcentaje)).toBe(true);
      expect(cupon.porcentaje).toBeGreaterThanOrEqual(1);
      expect(cupon.porcentaje).toBeLessThanOrEqual(99);
      expect(typeof cupon.nombre).toBe('string');
      expect(cupon.nombre.length).toBeGreaterThan(0);
      expect(typeof cupon.condicion).toBe('string');
      expect(cupon.condicion.length).toBeGreaterThan(0);
    }
  });

  it('cada campaña tiene descripción y nombre no vacíos', () => {
    for (const campana of promociones.campanas) {
      expect(typeof campana.nombre).toBe('string');
      expect(campana.nombre.length).toBeGreaterThan(0);
      expect(typeof campana.descripcion).toBe('string');
      expect(campana.descripcion.length).toBeGreaterThan(0);
    }
  });

  it('todas las fechas desde/hasta matchean YYYY-MM-DD y hasta >= desde', () => {
    for (const promo of [...promociones.cupones, ...promociones.campanas]) {
      expect(promo.desde).toMatch(FECHA_REGEX);
      expect(promo.hasta).toMatch(FECHA_REGEX);
      expect(promo.hasta >= promo.desde).toBe(true);
    }
  });

  it('tiene al menos 3 faqs con pregunta y respuesta no vacías', () => {
    expect(Array.isArray(promociones.faqs)).toBe(true);
    expect(promociones.faqs.length).toBeGreaterThanOrEqual(3);
    for (const faq of promociones.faqs) {
      expect(typeof faq.pregunta).toBe('string');
      expect(faq.pregunta.length).toBeGreaterThan(0);
      expect(typeof faq.respuesta).toBe('string');
      expect(faq.respuesta.length).toBeGreaterThan(0);
    }
  });
});

describe('clasificar', () => {
  const promo = { desde: '2026-07-13', hasta: '2026-08-12' };

  it('hoy === desde es vigente', () => {
    expect(clasificar(promo, '2026-07-13')).toBe('vigente');
  });

  it('hoy === hasta es vigente', () => {
    expect(clasificar(promo, '2026-08-12')).toBe('vigente');
  });

  it('el día siguiente a hasta es expirada', () => {
    expect(clasificar(promo, '2026-08-13')).toBe('expirada');
  });

  it('el día anterior a desde es proxima', () => {
    expect(clasificar(promo, '2026-07-12')).toBe('proxima');
  });
});

describe('hoyEnChile', () => {
  it('devuelve una fecha en formato YYYY-MM-DD', () => {
    expect(hoyEnChile()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getCuponesPublicables', () => {
  it('no devuelve cupones expirados', () => {
    const hoy = '2027-01-01';
    expect(getCuponesPublicables(hoy)).toEqual([]);
  });

  it('con fecha posterior a todas las ventanas devuelve arreglo vacío', () => {
    expect(getCuponesPublicables('2099-12-31')).toEqual([]);
  });

  it('incluye ambos cupones vigentes con estado vigente', () => {
    const resultado = getCuponesPublicables('2026-09-01');
    expect(resultado.map((item) => item.id)).toEqual(['nuevos-seguidores', 'seguidores']);
    expect(resultado.map((item) => item.estado)).toEqual(['vigente', 'vigente']);
  });
});

describe('getCampanasPublicables', () => {
  it('no devuelve campañas expiradas', () => {
    const hoy = '2027-01-01';
    expect(getCampanasPublicables(hoy)).toEqual([]);
  });

  it('con fecha posterior a todas las ventanas devuelve arreglo vacío', () => {
    expect(getCampanasPublicables('2099-12-31')).toEqual([]);
  });

  it('las vigentes van antes que las próximas y respeta el orden por desde', () => {
    const resultado = getCampanasPublicables('2026-09-11');
    expect(resultado.map((item) => item.id)).toEqual([
      'oferta-agosto-septiembre',
      'fiestas-patrias-2026',
      'cyber-monday-2026',
    ]);
    expect(resultado.map((item) => item.estado)).toEqual(['vigente', 'vigente', 'proxima']);
  });

  it('ordena por desde ascendente dentro de cada grupo de estado', () => {
    const hoy = '2020-01-01';
    const resultado = getCampanasPublicables(hoy);
    expect(resultado).toHaveLength(3);
    expect(resultado.map((item) => item.desde)).toEqual(['2026-08-13', '2026-09-10', '2026-10-05']);
    expect(resultado.map((item) => item.estado)).toEqual(['proxima', 'proxima', 'proxima']);
  });
});
