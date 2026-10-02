import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { construirLlmsTxt } from '../lib/llms';
import { hoyEnChile, promociones } from '../lib/promociones';
import { site } from '../lib/site';

export const GET: APIRoute = async () => {
  const [productos, guias] = await Promise.all([getCollection('productos'), getCollection('guias')]);
  const cuerpo = construirLlmsTxt({
    site,
    categorias: site.categorias,
    fichas: productos.map(({ data }) => data),
    guias: guias.map(({ data }) => data),
    promociones,
    hoy: hoyEnChile(),
  });
  return new Response(cuerpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
