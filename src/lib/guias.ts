import { getCollection, type CollectionEntry } from 'astro:content';

export type Guia = CollectionEntry<'guias'>;

export async function getGuias(): Promise<Guia[]> {
  return getCollection('guias');
}

export async function getGuiasPorProducto(slug: string): Promise<Guia[]> {
  const guias = await getGuias();
  return guias.filter((guia) => guia.data.productosRelacionados.includes(slug));
}
