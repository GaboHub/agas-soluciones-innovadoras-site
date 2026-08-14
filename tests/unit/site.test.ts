import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const siteJsonPath = path.resolve(dirname, '../../src/data/site.json');

const site = JSON.parse(readFileSync(siteJsonPath, 'utf-8'));

describe('site.json', () => {
  it('tiene el campo envio no vacío', () => {
    expect(typeof site.envio).toBe('string');
    expect(site.envio.length).toBeGreaterThan(0);
  });

  it('tiene la ubicación y dirección actualizadas a Santiago', () => {
    expect(site.ubicacion).toBe('Santiago, Región Metropolitana');
    expect(site.direccion.localidad).toBe('Santiago');
  });

  it('tiene los datos de contacto para ventas por volumen', () => {
    expect(site.contacto.email).toBe('agassolucionesinnovadoras@gmail.com');
    expect(site.contacto.ventasVolumen.length).toBeGreaterThan(0);
  });

  it('tiene los sellos de confianza esperados', () => {
    expect(site.sellosConfianza).toEqual([
      'Reputación verde',
      'Despacho el mismo día',
      'Desde Santiago a todo Chile',
    ]);
  });

  it('tiene el hero con título, palabra acentuada contenida en el título y bajada', () => {
    expect(site.hero.titulo).toBe('Soluciones innovadoras para tu día a día');
    expect(site.hero.titulo).toContain(site.hero.acentuada);
    expect(site.hero.bajada.length).toBeGreaterThan(0);
  });

  it('tiene el chip y la leyenda de la constelación del hero', () => {
    expect(site.hero.chip).toBe('Compra 100% protegida por Mercado Libre');
    expect(site.hero.leyendaConstelacion).toBe('Gaming · Audio · Compra protegida');
  });
});
