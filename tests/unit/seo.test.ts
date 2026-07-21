import { describe, expect, it } from 'vitest';
import { buildOrganization, buildProduct, buildWebSite, buildFaqPage } from '../../src/lib/seo';
import type { FaqItem } from '../../src/lib/faqs';

const logoUrl = 'https://agassoluciones.cl/_astro/logo.png';

describe('buildOrganization', () => {
  const organization = buildOrganization(logoUrl);

  it('incluye legalName, address y sameAs con los enlaces de Mercado Libre', () => {
    expect(organization['@type']).toBe('Organization');
    expect(organization.name).toBeTruthy();
    expect(organization.legalName).toBe('Agas Soluciones Innovadoras SpA');
    expect(organization.url).toBe('https://agassoluciones.cl');
    expect(organization.logo).toBe(logoUrl);
    expect(organization.address['@type']).toBe('PostalAddress');
    expect(organization.address.addressLocality).toBe('Macul');
    expect(organization.address.addressRegion).toBeTruthy();
    expect(organization.address.addressCountry).toBe('CL');
    expect(organization.sameAs).toHaveLength(2);
    for (const url of organization.sameAs) {
      expect(url).toContain('mercadolibre.cl');
    }
  });

  it('es serializable y re-parseable sin undefined', () => {
    const serializado = JSON.stringify(organization);
    expect(serializado).not.toContain('undefined');
    expect(JSON.parse(serializado)).toStrictEqual(organization);
  });
});

describe('buildProduct', () => {
  const base = {
    titulo: 'Producto de prueba',
    resumen: 'Resumen de prueba.',
    permalink: 'https://articulo.mercadolibre.cl/MLC-123-producto-_JM',
    precioReferencial: 12490,
  };
  const imagenes = ['https://agassoluciones.cl/_astro/01.webp'];

  it('genera una Offer con url del permalink, precio y CLP, sin availability', () => {
    const product = buildProduct(base, imagenes);
    expect(product['@type']).toBe('Product');
    expect(product.name).toBe(base.titulo);
    expect(product.image).toEqual(imagenes);
    expect(product.offers['@type']).toBe('Offer');
    expect(product.offers.url).toBe(base.permalink);
    expect(product.offers.price).toBe(12490);
    expect(product.offers.priceCurrency).toBe('CLP');
    expect(JSON.stringify(product)).not.toContain('availability');
  });

  it('omite aggregateRating cuando no hay reviews', () => {
    const product = buildProduct(base, imagenes);
    expect(product.aggregateRating).toBeUndefined();
    expect(JSON.stringify(product)).not.toContain('aggregateRating');
  });

  it('incluye aggregateRating cuando hay reviews', () => {
    const product = buildProduct({ ...base, reviews: { promedio: 4.9, cantidad: 16 } }, imagenes);
    expect(product.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.9,
      reviewCount: 16,
    });
  });

  it('es serializable y re-parseable sin undefined', () => {
    const product = buildProduct(base, imagenes);
    const serializado = JSON.stringify(product);
    expect(serializado).not.toContain('undefined');
    expect(JSON.parse(serializado)).toStrictEqual(product);
  });
});

describe('buildFaqPage', () => {
  const items: FaqItem[] = [
    { pregunta: '¿Pregunta uno?', respuesta: 'Respuesta uno.' },
    { pregunta: '¿Pregunta dos?', respuesta: 'Respuesta dos.' },
  ];
  const faqPage = buildFaqPage(items);

  it('genera un mainEntity con Question y acceptedAnswer por cada faq', () => {
    expect(faqPage['@type']).toBe('FAQPage');
    expect(faqPage.mainEntity).toHaveLength(items.length);
    faqPage.mainEntity.forEach((entrada, indice) => {
      expect(entrada['@type']).toBe('Question');
      expect(entrada.name).toBe(items[indice].pregunta);
      expect(entrada.acceptedAnswer['@type']).toBe('Answer');
      expect(entrada.acceptedAnswer.text).toBe(items[indice].respuesta);
    });
  });

  it('es serializable y re-parseable sin undefined', () => {
    const serializado = JSON.stringify(faqPage);
    expect(serializado).not.toContain('undefined');
    expect(JSON.parse(serializado)).toStrictEqual(faqPage);
  });
});

describe('buildWebSite', () => {
  const webSite = buildWebSite();

  it('incluye name y url', () => {
    expect(webSite['@type']).toBe('WebSite');
    expect(webSite.name).toBeTruthy();
    expect(webSite.url).toBe('https://agassoluciones.cl');
  });

  it('es serializable y re-parseable sin undefined', () => {
    const serializado = JSON.stringify(webSite);
    expect(serializado).not.toContain('undefined');
    expect(JSON.parse(serializado)).toStrictEqual(webSite);
  });
});
