import { describe, expect, it } from 'vitest';
import { destinoContacto, destinoSaliente } from '../../src/lib/analitica';

const dominios = ['mercadolibre.cl'];

describe('destinoSaliente', () => {
  it('matchea el dominio exacto', () => {
    expect(destinoSaliente('https://mercadolibre.cl/producto-x', dominios)).toBe(
      'https://mercadolibre.cl/producto-x',
    );
  });

  it('matchea el subdominio articulo.mercadolibre.cl', () => {
    expect(destinoSaliente('https://articulo.mercadolibre.cl/MLC-123', dominios)).toBe(
      'https://articulo.mercadolibre.cl/MLC-123',
    );
  });

  it('matchea el subdominio perfil.mercadolibre.cl', () => {
    expect(destinoSaliente('https://perfil.mercadolibre.cl/AGAS_SOLUCIONES', dominios)).toBe(
      'https://perfil.mercadolibre.cl/AGAS_SOLUCIONES',
    );
  });

  it('matchea el subdominio www.mercadolibre.cl', () => {
    expect(destinoSaliente('https://www.mercadolibre.cl/pagina/agas', dominios)).toBe(
      'https://www.mercadolibre.cl/pagina/agas',
    );
  });

  it('NO matchea un dominio con el mismo sufijo pero distinto (nomercadolibre.cl)', () => {
    expect(destinoSaliente('https://nomercadolibre.cl/x', dominios)).toBeNull();
  });

  it('NO matchea otro dominio', () => {
    expect(destinoSaliente('https://google.com', dominios)).toBeNull();
  });

  it('devuelve null para un href relativo', () => {
    expect(destinoSaliente('/productos/lamina-vidrio-nintendo-switch', dominios)).toBeNull();
  });

  it('devuelve null para un href malformado', () => {
    expect(destinoSaliente('::::no-es-una-url::::', dominios)).toBeNull();
  });

  it('matchea el subdominio www.instagram.com cuando instagram.com está en la lista', () => {
    expect(
      destinoSaliente('https://www.instagram.com/agassoluciones.cl/', ['mercadolibre.cl', 'instagram.com']),
    ).toBe('https://www.instagram.com/agassoluciones.cl/');
  });

  it('NO matchea instagram.com si no está en la lista de dominios salientes', () => {
    expect(destinoSaliente('https://www.instagram.com/agassoluciones.cl/', ['mercadolibre.cl'])).toBeNull();
  });
});

describe('destinoContacto', () => {
  it('devuelve el correo de un mailto simple', () => {
    expect(destinoContacto('mailto:agassolucionesinnovadoras@gmail.com')).toBe(
      'agassolucionesinnovadoras@gmail.com',
    );
  });

  it('devuelve el correo de un mailto con query subject', () => {
    expect(
      destinoContacto('mailto:agassolucionesinnovadoras@gmail.com?subject=Hola%20Mundo'),
    ).toBe('agassolucionesinnovadoras@gmail.com');
  });

  it('devuelve null para una URL http', () => {
    expect(destinoContacto('http://mercadolibre.cl')).toBeNull();
  });

  it('devuelve null para una URL https', () => {
    expect(destinoContacto('https://mercadolibre.cl')).toBeNull();
  });

  it('devuelve null para un tel:', () => {
    expect(destinoContacto('tel:+56912345678')).toBeNull();
  });

  it('devuelve null para un href malformado', () => {
    expect(destinoContacto('::::no-es-una-url::::')).toBeNull();
  });

  it('devuelve null para un mailto vacío', () => {
    expect(destinoContacto('mailto:')).toBeNull();
  });
});
