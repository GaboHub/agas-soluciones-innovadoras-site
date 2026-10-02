import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import site from '../data/site.json';

export interface FichaFechada {
  slug: string;
  fechaPrecio: string;
}

export interface GuiaFechada {
  slug: string;
  actualizado: string;
}

export interface CategoriaDeSitio {
  slug: string;
  productos: string[];
}

export interface FuentesFechadas {
  fichas: FichaFechada[];
  guias: GuiaFechada[];
  categorias: CategoriaDeSitio[];
}

const mayor = (fechas: string[]): string | undefined => [...fechas].sort().at(-1);

export function lastmodPorRuta({ fichas, guias, categorias }: FuentesFechadas): Record<string, string> {
  const mapa: Record<string, string> = {};
  const fechaDeFicha = new Map(fichas.map((ficha) => [ficha.slug, ficha.fechaPrecio]));
  const asignar = (ruta: string, fecha: string | undefined) => {
    if (fecha) mapa[ruta] = fecha;
  };

  for (const ficha of fichas) asignar(`/productos/${ficha.slug}/`, ficha.fechaPrecio);
  const todas = mayor(fichas.map((ficha) => ficha.fechaPrecio));
  asignar('/', todas);
  asignar('/productos/', todas);
  for (const categoria of categorias) {
    const fechas = categoria.productos.flatMap((slug) => fechaDeFicha.get(slug) ?? []);
    asignar(`/categorias/${categoria.slug}/`, mayor(fechas));
  }
  for (const guia of guias) asignar(`/guias/${guia.slug}/`, guia.actualizado);
  asignar('/guias/', mayor(guias.map((guia) => guia.actualizado)));
  return mapa;
}

const frontmatterDe = (raiz: string, directorio: string) =>
  readdirSync(path.join(raiz, directorio))
    .filter((archivo) => archivo.endsWith('.md'))
    .map((archivo) => matter(readFileSync(path.join(raiz, directorio, archivo), 'utf-8')).data);

export function leerFuentesFechadas(raiz: string): FuentesFechadas {
  return {
    fichas: frontmatterDe(raiz, 'content/productos').map(({ slug, fechaPrecio }) => ({ slug, fechaPrecio })),
    guias: frontmatterDe(raiz, 'content/guias').map(({ slug, actualizado }) => ({ slug, actualizado })),
    categorias: site.categorias.map(({ slug, productos }) => ({ slug, productos })),
  };
}
