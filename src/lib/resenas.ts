import raw from '../data/resenas.json';

export interface ResenaDestacada {
  productoSlug: string;
  productoTitulo: string;
  estrellas: number;
  titulo: string;
  texto: string;
  fecha: string;
}

export interface ResenasData {
  mercadolibre: {
    nivel: string;
    transacciones: number;
    url: string;
  };
  promedioGeneral: number;
  totalReviews: number;
  destacadas: ResenaDestacada[];
}

export const resenas: ResenasData = raw as ResenasData;
