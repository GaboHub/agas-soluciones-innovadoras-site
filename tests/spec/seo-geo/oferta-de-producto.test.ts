import { describe, expect, it } from 'vitest';
import { buildOffer } from '../../../src/lib/seo';

const base = { url: 'https://articulo.mercadolibre.cl/MLC-1-prueba-_JM', precio: 12490 };

describe('[seo-geo] Oferta de producto', () => {
  it('Oferta completa', () => {
    const oferta = JSON.parse(JSON.stringify(buildOffer({ ...base, condicion: 'new' })));
    expect(oferta).toEqual({
      '@type': 'Offer',
      url: base.url,
      price: 12490,
      priceCurrency: 'CLP',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': 'https://agassoluciones.cl/#organizacion' },
    });
  });

  it('mapea used y refurbished a su condición de schema.org', () => {
    expect(buildOffer({ ...base, condicion: 'used' }).itemCondition).toBe('https://schema.org/UsedCondition');
    expect(buildOffer({ ...base, condicion: 'refurbished' }).itemCondition).toBe(
      'https://schema.org/RefurbishedCondition',
    );
  });
});
