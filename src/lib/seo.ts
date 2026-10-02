import { site } from './site';
import type { FaqItem } from './faqs';
import type { Campana } from './promociones';

export interface OrganizationJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  '@id': string;
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

export type Condicion = 'new' | 'used' | 'refurbished';

export interface OfferJsonLd {
  '@type': 'Offer';
  url: string;
  price: number;
  priceCurrency: 'CLP';
  availability: 'https://schema.org/InStock';
  itemCondition: string;
  seller: { '@id': string };
}

interface BrandJsonLd {
  '@type': 'Brand';
  name: string;
}

interface AggregateRatingJsonLd {
  '@type': 'AggregateRating';
  ratingValue: number;
  reviewCount: number;
}

export interface ProductJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Product';
  name: string;
  description: string;
  image: string[];
  brand: BrandJsonLd;
  offers: OfferJsonLd;
  aggregateRating?: AggregateRatingJsonLd;
}

export interface VarianteJsonLd {
  '@type': 'Product';
  name: string;
  image?: string;
  color?: string;
  pattern?: string;
  offers: OfferJsonLd;
}

export interface ProductGroupJsonLd {
  '@context': 'https://schema.org';
  '@type': 'ProductGroup';
  name: string;
  description: string;
  image: string[];
  brand: BrandJsonLd;
  productGroupID: string;
  variesBy?: string[];
  hasVariant: VarianteJsonLd[];
  aggregateRating?: AggregateRatingJsonLd;
}

export interface ItemListJsonLd {
  '@context': 'https://schema.org';
  '@type': 'ItemList';
  itemListElement: { '@type': 'ListItem'; position: number; url: string }[];
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

export interface SaleEventJsonLd {
  '@context': 'https://schema.org';
  '@type': 'SaleEvent';
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode';
  location: {
    '@type': 'VirtualLocation';
    url: string;
  };
}

export interface BreadcrumbListJsonLd {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: {
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }[];
}

export interface ArticleJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Article';
  headline: string;
  description: string;
  inLanguage: 'es-CL';
  publisher: OrganizationJsonLd;
  mainEntityOfPage: string;
  datePublished: string;
  dateModified: string;
}

export interface ProductoSeo {
  titulo: string;
  resumen: string;
  permalink: string;
  precioReferencial: number;
  condicion: Condicion;
  reviews?: {
    promedio: number;
    cantidad: number;
  };
}

export interface OpcionSeo {
  nombre: string;
  link: string;
  precio: number;
  ejes: Record<string, string>;
  imagen?: string;
}

export interface OpcionesSeo {
  agrupada: boolean;
  gruposFicha: { nombre: string; opciones: OpcionSeo[] }[];
}

const SITE_URL = `https://${site.dominio}`;
const ORGANIZATION_ID = `${SITE_URL}/#organizacion`;

const CONDICION_SCHEMA: Record<Condicion, string> = {
  new: 'https://schema.org/NewCondition',
  used: 'https://schema.org/UsedCondition',
  refurbished: 'https://schema.org/RefurbishedCondition',
};

const PROPIEDAD_DE_EJE: Record<string, 'color' | 'pattern'> = {
  Color: 'color',
  Diseño: 'pattern',
};

export function buildOrganization(logoAbsoluteUrl: string): OrganizationJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
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

export function buildOffer({ url, precio, condicion }: { url: string; precio: number; condicion: Condicion }): OfferJsonLd {
  return {
    '@type': 'Offer',
    url,
    price: precio,
    priceCurrency: 'CLP',
    availability: 'https://schema.org/InStock',
    itemCondition: CONDICION_SCHEMA[condicion],
    seller: { '@id': ORGANIZATION_ID },
  };
}

const marca = (): BrandJsonLd => ({ '@type': 'Brand', name: site.nombre });

const calificacion = (reviews: ProductoSeo['reviews']): AggregateRatingJsonLd | undefined =>
  reviews && reviews.cantidad > 0
    ? { '@type': 'AggregateRating', ratingValue: reviews.promedio, reviewCount: reviews.cantidad }
    : undefined;

export function buildProduct(producto: ProductoSeo, imageUrls: string[]): ProductJsonLd {
  const base: ProductJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: producto.titulo,
    description: producto.resumen,
    image: imageUrls,
    brand: marca(),
    offers: buildOffer({ url: producto.permalink, precio: producto.precioReferencial, condicion: producto.condicion }),
  };
  const aggregateRating = calificacion(producto.reviews);
  if (aggregateRating) base.aggregateRating = aggregateRating;
  return base;
}

export function buildProductGroup(
  producto: ProductoSeo & { slug: string },
  { agrupada, gruposFicha }: OpcionesSeo,
  imageUrls: string[],
): ProductGroupJsonLd {
  const opciones = gruposFicha.flatMap((grupo) => grupo.opciones.map((opcion) => ({ grupo: grupo.nombre, opcion })));
  const ejesDeclarados = Object.keys(opciones[0]?.opcion.ejes ?? {}).filter(
    (eje) => eje in PROPIEDAD_DE_EJE && opciones.every(({ opcion }) => eje in opcion.ejes),
  );
  const hasVariant = opciones.map(({ grupo, opcion }): VarianteJsonLd => {
    const variante: VarianteJsonLd = {
      '@type': 'Product',
      name: `${producto.titulo} (${agrupada ? `${grupo}, ${opcion.nombre}` : opcion.nombre})`,
      offers: buildOffer({ url: opcion.link, precio: opcion.precio, condicion: producto.condicion }),
    };
    if (opcion.imagen) variante.image = opcion.imagen;
    for (const eje of ejesDeclarados) variante[PROPIEDAD_DE_EJE[eje]] = opcion.ejes[eje];
    return variante;
  });
  const grupo: ProductGroupJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProductGroup',
    name: producto.titulo,
    description: producto.resumen,
    image: imageUrls,
    brand: marca(),
    productGroupID: producto.slug,
    hasVariant,
  };
  if (ejesDeclarados.length > 0) {
    grupo.variesBy = ejesDeclarados.map((eje) => `https://schema.org/${PROPIEDAD_DE_EJE[eje]}`);
  }
  const aggregateRating = calificacion(producto.reviews);
  if (aggregateRating) grupo.aggregateRating = aggregateRating;
  return grupo;
}

export function buildItemList(urls: string[]): ItemListJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: urls.map((url, indice) => ({ '@type': 'ListItem', position: indice + 1, url })),
  };
}

export function buildBreadcrumbList(categoria: { nombre: string; slug: string }, productoTitulo: string): BreadcrumbListJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoria.nombre,
        item: `${SITE_URL}/categorias/${categoria.slug}/`,
      },
      { '@type': 'ListItem', position: 3, name: productoTitulo },
    ],
  };
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

export function buildSaleEvent(campana: Campana): SaleEventJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'SaleEvent',
    name: campana.nombre,
    description: campana.descripcion,
    startDate: campana.desde,
    endDate: campana.hasta,
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url: site.mercadolibre.tienda,
    },
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

export function buildArticle({
  headline,
  description,
  publisher,
  url,
  publicado,
  actualizado,
}: {
  headline: string;
  description: string;
  publisher: OrganizationJsonLd;
  url: string;
  publicado: string;
  actualizado: string;
}): ArticleJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    inLanguage: 'es-CL',
    publisher,
    mainEntityOfPage: url,
    datePublished: publicado,
    dateModified: actualizado,
  };
}
