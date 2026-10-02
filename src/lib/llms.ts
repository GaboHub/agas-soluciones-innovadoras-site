import { formatearFecha, formatearPrecioCLP } from './formato';
import { publicables } from './promociones';
import type { EstadoPromocion, PromocionesData } from './promociones';
import type { Categoria, SiteData } from './site';

export interface FichaLlms {
  slug: string;
  titulo: string;
  precioReferencial: number;
  fechaPrecio: string;
  permalink: string;
}

export interface GuiaLlms {
  slug: string;
  titulo: string;
  descripcion: string;
}

export interface EntradaLlms {
  site: Pick<SiteData, 'nombre' | 'descripcion' | 'dominio' | 'mercadolibre'>;
  categorias: Array<Pick<Categoria, 'nombre' | 'productos'>>;
  fichas: FichaLlms[];
  guias: GuiaLlms[];
  promociones: Pick<PromocionesData, 'cupones' | 'campanas'>;
  hoy: string;
}

const ventana = (estado: EstadoPromocion, promo: { desde: string; hasta: string }) =>
  `${estado === 'proxima' ? 'próximamente' : 'vigente'} del ${formatearFecha(promo.desde)} al ${formatearFecha(promo.hasta)}`;

export function construirLlmsTxt({ site, categorias, fichas, guias, promociones, hoy }: EntradaLlms): string {
  const base = `https://${site.dominio}`;
  const lineas: string[] = [
    `# ${site.nombre}`,
    '',
    `> ${site.descripcion}`,
    '',
    `Tienda en Mercado Libre: ${site.mercadolibre.tienda}`,
    `Página oficial en Mercado Libre: ${site.mercadolibre.paginaOficial}`,
    '',
    '## Catálogo',
    '',
  ];

  for (const categoria of categorias) {
    lineas.push(`### ${categoria.nombre}`, '');
    for (const slug of categoria.productos) {
      const ficha = fichas.find((candidata) => candidata.slug === slug);
      if (!ficha) continue;
      lineas.push(
        `- [${ficha.titulo}](${base}/productos/${ficha.slug}/): precio referencial ${formatearPrecioCLP(ficha.precioReferencial)} al ${formatearFecha(ficha.fechaPrecio)}; en Mercado Libre: ${ficha.permalink}`,
      );
    }
    lineas.push('');
  }

  if (guias.length > 0) {
    lineas.push('## Guías', '');
    const ordenadas = [...guias].sort((a, b) => a.titulo.localeCompare(b.titulo));
    for (const guia of ordenadas) {
      lineas.push(`- [${guia.titulo}](${base}/guias/${guia.slug}/): ${guia.descripcion}`);
    }
    lineas.push('');
  }

  const cupones = publicables(promociones.cupones, hoy);
  const campanas = publicables(promociones.campanas, hoy);
  lineas.push('## Promociones', '', `Cupones y campañas de la tienda: ${base}/promociones/`, '');
  if (cupones.length + campanas.length === 0) {
    lineas.push('No hay promociones activas en este momento.');
  }
  for (const cupon of cupones) {
    lineas.push(`- Cupón: ${cupon.nombre}, ${cupon.porcentaje}% (${ventana(cupon.estado, cupon)})`);
  }
  for (const campana of campanas) {
    lineas.push(`- Campaña: ${campana.nombre} (${ventana(campana.estado, campana)})`);
  }
  lineas.push(
    '',
    '## Más información',
    '',
    `- [Preguntas frecuentes](${base}/preguntas-frecuentes/)`,
    `- [Contacto](${base}/contacto/)`,
    '',
  );

  return lineas.join('\n');
}
