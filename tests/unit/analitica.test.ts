import { describe, expect, it } from 'vitest';
import { destinoSaliente } from '../../src/lib/analitica';

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
});
