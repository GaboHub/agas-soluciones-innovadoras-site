import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from './site';

export type Producto = CollectionEntry<'productos'>;

const ordenPorSlug = new Map(
  site.categorias.flatMap((categoria) => categoria.productos).map((slug, indice) => [slug, indice]),
);

export async function getProductos(): Promise<Producto[]> {
  const productos = await getCollection('productos');
  return productos.sort(
    (a, b) => (ordenPorSlug.get(a.data.slug) ?? 999) - (ordenPorSlug.get(b.data.slug) ?? 999),
  );
}

export async function getProductosDeCategoria(slug: string): Promise<Producto[]> {
  const productos = await getProductos();
  return productos.filter((producto) => producto.data.categoria === slug);
}

export async function getProductosPorSlugs(slugs: string[]): Promise<Producto[]> {
  const productos = await getProductos();
  const mapa = new Map(productos.map((producto) => [producto.data.slug, producto]));
  return slugs
    .map((slug) => mapa.get(slug))
    .filter((producto): producto is Producto => Boolean(producto));
}

type ConResenas = { data: { slug: string; reviews?: { cantidad: number; promedio: number } | null } };

export function ordenarPorResenas<T extends ConResenas>(productos: T[], cantidad: number): T[] {
  return productos
    .filter((producto) => producto.data.reviews && producto.data.reviews.cantidad > 0)
    .sort(
      (a, b) =>
        (b.data.reviews?.cantidad ?? 0) - (a.data.reviews?.cantidad ?? 0) ||
        (b.data.reviews?.promedio ?? 0) - (a.data.reviews?.promedio ?? 0) ||
        a.data.slug.localeCompare(b.data.slug),
    )
    .slice(0, cantidad);
}

export async function getProductosDestacados(cantidad = 4): Promise<Producto[]> {
  return ordenarPorResenas(await getProductos(), cantidad);
}

export function atributosDeProducto(producto: Producto): string[] {
  const { variantes, miembros, grupos } = producto.data;
  const valores = new Set<string>();
  for (const variante of variantes ?? []) {
    valores.add(variante.nombre);
  }
  for (const miembro of miembros ?? []) {
    for (const valor of Object.values(miembro.atributos)) {
      valores.add(valor);
    }
  }
  for (const grupo of grupos ?? []) {
    valores.add(grupo.diseno);
    for (const color of grupo.colores) {
      valores.add(color.color);
    }
  }
  return [...valores];
}
