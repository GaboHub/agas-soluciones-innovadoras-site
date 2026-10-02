import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCampanasPublicables, getCuponesPublicables, hoyEnChile } from '../../src/lib/promociones';

describe('hoyEnChile', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('devuelve una fecha en formato YYYY-MM-DD', () => {
    vi.stubEnv('AGAS_FECHA_BUILD', '');
    expect(hoyEnChile()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('usa AGAS_FECHA_BUILD cuando es una fecha válida', () => {
    vi.stubEnv('AGAS_FECHA_BUILD', '2031-03-10');
    expect(hoyEnChile()).toBe('2031-03-10');
  });

  it('ignora AGAS_FECHA_BUILD con formato inválido', () => {
    vi.stubEnv('AGAS_FECHA_BUILD', '10-03-2031');
    expect(hoyEnChile()).not.toBe('10-03-2031');
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
    const resultado = getCuponesPublicables('2026-10-01');
    expect(resultado.map((item) => item.id)).toEqual(['nuevos-seguidores', 'seguidores']);
    expect(resultado.map((item) => item.estado)).toEqual(['vigente', 'vigente']);
  });

  it('el último día de vigencia (2026-10-27) siguen vigentes y al día siguiente ninguno', () => {
    const ultimo = getCuponesPublicables('2026-10-27');
    expect(ultimo.map((item) => item.id)).toEqual(['nuevos-seguidores', 'seguidores']);
    expect(ultimo.map((item) => item.estado)).toEqual(['vigente', 'vigente']);
    expect(getCuponesPublicables('2026-10-28')).toEqual([]);
  });

  it('el día anterior al inicio (2026-09-27) ambos son próximos y el 2026-09-28 vigentes', () => {
    const previo = getCuponesPublicables('2026-09-27');
    expect(previo.map((item) => item.id)).toEqual(['nuevos-seguidores', 'seguidores']);
    expect(previo.map((item) => item.estado)).toEqual(['proxima', 'proxima']);
    expect(getCuponesPublicables('2026-09-28').map((item) => item.estado)).toEqual(['vigente', 'vigente']);
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
    const resultado = getCampanasPublicables('2026-10-01');
    expect(resultado.map((item) => item.id)).toEqual(['oferta-septiembre-octubre', 'cyber-monday-2026']);
    expect(resultado.map((item) => item.estado)).toEqual(['vigente', 'proxima']);
  });

  it('oferta-septiembre-octubre es vigente hasta el 2026-10-14 y desaparece el 2026-10-15', () => {
    const ultimo = getCampanasPublicables('2026-10-14');
    expect(ultimo.find((item) => item.id === 'oferta-septiembre-octubre')?.estado).toBe('vigente');
    const siguiente = getCampanasPublicables('2026-10-15');
    expect(siguiente.map((item) => item.id)).not.toContain('oferta-septiembre-octubre');
  });

  it('oferta-septiembre-octubre es próxima el 2026-09-13 y vigente el 2026-09-14', () => {
    const previo = getCampanasPublicables('2026-09-13');
    expect(previo.find((item) => item.id === 'oferta-septiembre-octubre')?.estado).toBe('proxima');
    const inicio = getCampanasPublicables('2026-09-14');
    expect(inicio.find((item) => item.id === 'oferta-septiembre-octubre')?.estado).toBe('vigente');
  });

  it('ordena por desde ascendente dentro de cada grupo de estado', () => {
    const hoy = '2020-01-01';
    const resultado = getCampanasPublicables(hoy);
    expect(resultado).toHaveLength(2);
    expect(resultado.map((item) => item.desde)).toEqual(['2026-09-14', '2026-10-05']);
    expect(resultado.map((item) => item.estado)).toEqual(['proxima', 'proxima']);
  });
});
