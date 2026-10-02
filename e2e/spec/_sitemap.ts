import type { APIRequestContext, Page } from '@playwright/test';

export const urlsDelSitemap = async (request: APIRequestContext): Promise<string[]> => {
  const respuesta = await request.get('/sitemap-0.xml');
  const xml = await respuesta.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((coincidencia) => coincidencia[1]);
};

export const rutaDe = (url: string): string => new URL(url).pathname;

export const leerMetadatos = (page: Page) =>
  page.evaluate(() => {
    const atributo = (selector: string, nombre: string) =>
      document.querySelector(selector)?.getAttribute(nombre) ?? null;
    const meta = (propiedad: string) => atributo(`meta[property="${propiedad}"]`, 'content');
    return {
      lang: document.documentElement.getAttribute('lang'),
      title: document.title,
      description: atributo('meta[name="description"]', 'content'),
      canonical: atributo('link[rel="canonical"]', 'href'),
      robots: atributo('meta[name="robots"]', 'content'),
      og: {
        type: meta('og:type'),
        siteName: meta('og:site_name'),
        title: meta('og:title'),
        description: meta('og:description'),
        url: meta('og:url'),
        image: meta('og:image'),
        imageWidth: meta('og:image:width'),
        imageHeight: meta('og:image:height'),
        locale: meta('og:locale'),
      },
      twitterCard: atributo('meta[name="twitter:card"]', 'content'),
      favicon: atributo('link[rel="icon"]', 'href'),
      appleTouchIcon: atributo('link[rel="apple-touch-icon"]', 'href'),
    };
  });
