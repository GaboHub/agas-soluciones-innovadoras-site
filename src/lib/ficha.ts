import { formatearPrecioCLP } from './formato';

export interface ProductoFicha {
  titulo: string;
  permalink: string;
  precioReferencial: number;
  imagenes: string[];
  etiquetaGrupo?: string;
  etiquetaOpcion?: string;
  grupos?: {
    diseno: string;
    colores: {
      color: string;
      link: string;
      imagenes: string[];
    }[];
  }[];
  miembros?: {
    titulo: string;
    link: string;
    precio: number;
    imagenes: string[];
    atributos: Record<string, string>;
  }[];
  variantes?: {
    nombre: string;
    atributo: string;
    link: string;
    imagenes: string[];
  }[];
}

export interface OpcionFichaBase {
  nombre: string;
  link: string;
  precioTexto: string;
  rutasImagenes: string[];
  altFotos: string;
}

export interface GrupoFichaBase {
  nombre: string;
  opciones: OpcionFichaBase[];
}

export interface ResultadoFicha {
  gruposFicha: GrupoFichaBase[];
  etiquetaGrupo: string;
  etiquetaOpcion: string;
}

export function construirGruposFicha(data: ProductoFicha): ResultadoFicha {
  const precioBaseTexto = formatearPrecioCLP(data.precioReferencial);

  let gruposFicha: GrupoFichaBase[] = [];
  let etiquetaGrupo = 'Diseño';
  let etiquetaOpcion = 'Variante';

  if (data.grupos && data.grupos.length > 0) {
    etiquetaGrupo = data.etiquetaGrupo ?? etiquetaGrupo;
    etiquetaOpcion = data.etiquetaOpcion ?? 'Color';
    gruposFicha = data.grupos.map((grupo) => ({
      nombre: grupo.diseno,
      opciones: grupo.colores.map((color) => ({
        nombre: color.color,
        link: color.link,
        precioTexto: precioBaseTexto,
        rutasImagenes: color.imagenes,
        altFotos: `${data.titulo} (${grupo.diseno}, ${color.color})`,
      })),
    }));
  } else if (data.miembros && data.miembros.length > 0) {
    etiquetaOpcion = 'Opción';
    gruposFicha = [
      {
        nombre: data.titulo,
        opciones: data.miembros.map((miembro) => ({
          nombre: miembro.atributos.color ?? miembro.titulo,
          link: miembro.link,
          precioTexto: formatearPrecioCLP(miembro.precio),
          rutasImagenes: miembro.imagenes,
          altFotos: miembro.titulo,
        })),
      },
    ];
  } else if (data.variantes && data.variantes.length > 0) {
    etiquetaOpcion = data.variantes[0].atributo;
    gruposFicha = [
      {
        nombre: data.titulo,
        opciones: data.variantes.map((variante) => ({
          nombre: variante.nombre,
          link: variante.link,
          precioTexto: precioBaseTexto,
          rutasImagenes: variante.imagenes,
          altFotos: `${data.titulo} (${variante.nombre})`,
        })),
      },
    ];
  } else {
    gruposFicha = [
      {
        nombre: data.titulo,
        opciones: [
          {
            nombre: data.titulo,
            link: data.permalink,
            precioTexto: precioBaseTexto,
            rutasImagenes: data.imagenes,
            altFotos: data.titulo,
          },
        ],
      },
    ];
  }

  return { gruposFicha, etiquetaGrupo, etiquetaOpcion };
}

export function linkInicial(grupos: { opciones: { link: string }[] }[]): string {
  return grupos[0].opciones[0].link;
}
