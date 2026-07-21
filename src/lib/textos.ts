import raw from '../data/textos-productos.json';

export interface TextoProducto {
  descripcion: string;
  metaDescription: string;
}

const textos: Record<string, TextoProducto> = raw;

export function getTextoProducto(slug: string): TextoProducto | undefined {
  return textos[slug];
}

export function descripcionProducto(slug: string, resumenFallback: string): string {
  return textos[slug]?.descripcion ?? resumenFallback;
}
