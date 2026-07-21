import { site } from './site';
import type { FaqItem } from './faqs';

export interface OrganizationJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  legalName: string;
  url: string;
  logo: string;
  address: {
    '@type': 'PostalAddress';
    addressLocality: string;
    addressRegion: string;
    addressCountry: string;
  };
  sameAs: string[];
}

export interface ProductJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Product';
  name: string;
  description: string;
  image: string[];
  brand: {
    '@type': 'Brand';
    name: string;
  };
  offers: {
    '@type': 'Offer';
    url: string;
    price: number;
    priceCurrency: 'CLP';
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: number;
    reviewCount: number;
  };
}

export interface FaqPageJsonLd {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: {
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }[];
}

export interface WebSiteJsonLd {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  url: string;
  description: string;
}

export interface ArticleJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Article';
  headline: string;
  description: string;
  inLanguage: 'es-CL';
  publisher: OrganizationJsonLd;
  mainEntityOfPage: string;
}

export interface ProductoSeo {
  titulo: string;
  resumen: string;
  permalink: string;
  precioReferencial: number;
  reviews?: {
    promedio: number;
    cantidad: number;
  };
}

const SITE_URL = `https://${site.dominio}`;

export function buildOrganization(logoAbsoluteUrl: string): OrganizationJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.nombre,
    legalName: site.razonSocial,
    url: SITE_URL,
    logo: logoAbsoluteUrl,
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.direccion.localidad,
      addressRegion: site.direccion.region,
      addressCountry: site.direccion.pais,
    },
    sameAs: [site.mercadolibre.tienda, site.mercadolibre.paginaOficial],
  };
}

export function buildProduct(producto: ProductoSeo, imageUrls: string[]): ProductJsonLd {
  const base: ProductJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.titulo,
    description: producto.resumen,
    image: imageUrls,
    brand: {
      '@type': 'Brand',
      name: site.nombre,
    },
    offers: {
      '@type': 'Offer',
      url: producto.permalink,
      price: producto.precioReferencial,
      priceCurrency: 'CLP',
    },
  };
  if (producto.reviews && producto.reviews.cantidad > 0) {
    base.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: producto.reviews.promedio,
      reviewCount: producto.reviews.cantidad,
    };
  }
  return base;
}

export function buildFaqPage(faqs: FaqItem[]): FaqPageJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.pregunta,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.respuesta,
      },
    })),
  };
}

export function buildWebSite(): WebSiteJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.nombre,
    url: SITE_URL,
    description: site.descripcion,
  };
}

export function buildArticle(headline: string, description: string, publisher: OrganizationJsonLd, url: string): ArticleJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    inLanguage: 'es-CL',
    publisher,
    mainEntityOfPage: url,
  };
}
