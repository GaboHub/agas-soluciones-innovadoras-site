import { describe, expect, it } from 'vitest';
import {
  buildOrganization,
  buildProduct,
  buildWebSite,
  buildFaqPage,
  buildSaleEvent,
  buildBreadcrumbList,
} from '../../src/lib/seo';
import type { FaqItem } from '../../src/lib/faqs';
import type { Campana } from '../../src/lib/promociones';

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

describe('buildSaleEvent', () => {
  const campana: Campana = {
    id: 'campana-de-prueba',
    nombre: 'Campaña de prueba',
    descripcion: 'Descripción de la campaña de prueba.',
    desde: '2026-07-01',
    hasta: '2026-07-31',
  };
  const saleEvent = buildSaleEvent(campana);

  it('mapea nombre, descripción y fechas de vigencia de la campaña', () => {
    expect(saleEvent['@type']).toBe('SaleEvent');
    expect(saleEvent.name).toBe(campana.nombre);
    expect(saleEvent.description).toBe(campana.descripcion);
    expect(saleEvent.startDate).toBe(campana.desde);
    expect(saleEvent.endDate).toBe(campana.hasta);
    expect(saleEvent.eventAttendanceMode).toBe('https://schema.org/OnlineEventAttendanceMode');
    expect(saleEvent.location['@type']).toBe('VirtualLocation');
    expect(saleEvent.location.url).toContain('mercadolibre.cl');
  });

  it('no incluye precios ni ofertas', () => {
    const serializado = JSON.stringify(saleEvent);
    expect(serializado).not.toContain('offers');
    expect(serializado).not.toContain('price');
  });

  it('es serializable y re-parseable sin undefined', () => {
    const serializado = JSON.stringify(saleEvent);
    expect(serializado).not.toContain('undefined');
    expect(JSON.parse(serializado)).toStrictEqual(saleEvent);
  });
});

describe('buildBreadcrumbList', () => {
  const categoria = { nombre: 'Nintendo Switch', slug: 'nintendo-switch' };
  const breadcrumb = buildBreadcrumbList(categoria, 'Producto de prueba');

  it('genera un itemListElement con posiciones 1..3 y el último ítem sin item', () => {
    expect(breadcrumb['@type']).toBe('BreadcrumbList');
    expect(breadcrumb.itemListElement).toHaveLength(3);
    breadcrumb.itemListElement.forEach((entrada, indice) => {
      expect(entrada['@type']).toBe('ListItem');
      expect(entrada.position).toBe(indice + 1);
    });
    expect(breadcrumb.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Inicio',
      item: 'https://agassoluciones.cl/',
    });
    expect(breadcrumb.itemListElement[1]).toEqual({
      '@type': 'ListItem',
      position: 2,
      name: categoria.nombre,
      item: 'https://agassoluciones.cl/categorias/nintendo-switch/',
    });
    expect(breadcrumb.itemListElement[2].name).toBe('Producto de prueba');
    expect(breadcrumb.itemListElement[2].item).toBeUndefined();
  });

  it('es serializable y re-parseable sin undefined', () => {
    const serializado = JSON.stringify(breadcrumb);
    expect(serializado).not.toContain('undefined');
    expect(JSON.parse(serializado)).toStrictEqual(breadcrumb);
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
