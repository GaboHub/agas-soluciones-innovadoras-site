import { describe, expect, it } from 'vitest';
import site from '../../../src/data/site.json';
import { destinosEnAmbasListas, dominiosAjenosAlMarketplace } from './_listas';

describe('[analitica] Un evento por click y listas disjuntas', () => {
  it('Dominio en ambas listas', () => {
    expect(
      destinosEnAmbasListas({ dominiosSalientes: ['mercadolibre.cl', 'instagram.com'], dominiosRedes: ['instagram.com'] }),
    ).toEqual(['instagram.com']);
    expect(destinosEnAmbasListas(site.analitica)).toEqual([]);
  });

  it('dominiosSalientes contiene solo dominios de marketplace', () => {
    expect(site.analitica.dominiosSalientes.length).toBeGreaterThan(0);
    expect(dominiosAjenosAlMarketplace(site.analitica.dominiosSalientes, [site.mercadolibre.tienda, site.mercadolibre.paginaOficial])).toEqual([]);
    expect(dominiosAjenosAlMarketplace(['instagram.com'], [site.mercadolibre.tienda])).toEqual(['instagram.com']);
  });
});
