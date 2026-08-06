import raw from '../data/site.json';

export interface Categoria {
  slug: string;
  nombre: string;
  emoji: string;
  resumen: string;
  productos: string[];
}

export interface SiteData {
  nombre: string;
  razonSocial: string;
  dominio: string;
  tagline: string;
  claim: string;
  descripcion: string;
  ubicacion: string;
  cobertura: string;
  envio: string;
  direccion: {
    localidad: string;
    region: string;
    pais: string;
  };
  mercadolibre: {
    tienda: string;
    paginaOficial: string;
  };
  analitica: {
    dominiosSalientes: string[];
  };
  ctaHeader: string;
  ctaBurbujaProducto: string;
  footer: string;
  contacto: {
    email: string;
    ventasVolumen: string;
  };
  sellosConfianza: string[];
  hero: {
    titulo: string;
    acentuada: string;
    bajada: string;
    chip: string;
    leyendaConstelacion: string;
  };
  categorias: Categoria[];
}

export const site: SiteData = raw as SiteData;

export const siteUrl = new URL(`https://${site.dominio}`);

export function getCategoria(slug: string): Categoria | undefined {
  return site.categorias.find((categoria) => categoria.slug === slug);
}

export function getOtrasCategorias(slug: string): Categoria[] {
  return site.categorias.filter((categoria) => categoria.slug !== slug);
}
