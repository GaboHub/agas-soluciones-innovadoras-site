import type { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { crearContenedor } from '../_contenedor';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import PaginaPromociones from '../../../src/components/PaginaPromociones.astro';
import Resenas from '../../../src/components/Resenas.astro';
import { resenas } from '../../../src/lib/resenas';
import { site } from '../../../src/lib/site';
import type { Campana, Cupon, EstadoPromocion } from '../../../src/lib/promociones';

const raiz = path.resolve(import.meta.dirname, '../../..');
const dominiosPermitidos = ['schema.org', 'googletagmanager.com', 'w3.org'];
const urlExterna = /https?:\/\/[^\s"'`<>)]+/g;
const correo = /[\w.+-]+@[\w-]+\.[\w.]+/g;

const archivosDe = (directorio: string): string[] =>
  readdirSync(path.join(raiz, directorio), { recursive: true, encoding: 'utf-8' })
    .map((relativo) => path.join(directorio, relativo))
    .filter((ruta) => statSync(path.join(raiz, ruta)).isFile());

const esDominioPermitido = (hostname: string): boolean =>
  dominiosPermitidos.some((dominio) => hostname === dominio || hostname.endsWith(`.${dominio}`));

const clavesDeCta = ['ctaHeader', 'ctaFicha', 'ctaCupon', 'ctaBurbujaProducto', 'ctaPaginaOficial'] as const;

const literalesDe = (archivos: { ruta: string; texto: string }[], textos: string[]): string[] =>
  archivos.flatMap(({ ruta, texto }) => textos.filter((candidato) => texto.includes(candidato)).map((candidato) => `${ruta}: ${candidato}`));

const hallazgosDe = (archivos: { ruta: string; texto: string }[]): string[] =>
  archivos.flatMap(({ ruta, texto }) => [
    ...(texto.match(urlExterna) ?? [])
      .filter((url) => !esDominioPermitido(new URL(url).hostname))
      .map((url) => `${ruta}: ${url}`),
    ...(texto.match(correo) ?? []).map((direccion) => `${ruta}: ${direccion}`),
  ]);

const fuentes = ['src/components', 'src/layouts', 'src/pages'].flatMap(archivosDe);

const cupon = (estado: EstadoPromocion): Cupon & { estado: EstadoPromocion } => ({
  id: 'cupon-de-prueba',
  nombre: 'Cupón de prueba',
  porcentaje: 17,
  condicion: 'Condición del cupón de prueba',
  desde: '2031-03-10',
  hasta: '2031-03-20',
  estado,
});

const campana = (estado: EstadoPromocion): Campana & { estado: EstadoPromocion } => ({
  id: 'campana-de-prueba',
  nombre: 'Campaña de prueba',
  descripcion: 'Descripción de la campaña de prueba',
  desde: '2031-04-01',
  hasta: '2031-04-30',
  estado,
});

let contenedor: AstroContainer;

beforeAll(async () => {
  contenedor = await crearContenedor();
});

const textoDelEnlace = (html: string, href: string): string[] =>
  [...html.matchAll(new RegExp(`<a[^>]*href="${href}"[^>]*>([\\s\\S]*?)</a>`, 'g'))].map((coincidencia) =>
    coincidencia[1].replace(/\s+/g, ' ').trim(),
  );

const renderPromociones = (props: { cupones: ReturnType<typeof cupon>[]; campanas: ReturnType<typeof campana>[] }) =>
  contenedor.renderToString(PaginaPromociones, { props: { aclaracion: 'Aclaración', faqs: [], ...props } });

const tarjeta = (html: string, nombre: string) =>
  (html.match(/<article[\s\S]*?<\/article>/g) ?? []).find((articulo) => articulo.includes(nombre)) ?? '';

describe('[sitio] Datos de negocio fuera de los componentes', () => {
  it('Escaneo de fuentes', () => {
    expect(fuentes.length).toBeGreaterThan(0);
    const lecturas = fuentes.map((ruta) => ({ ruta, texto: readFileSync(path.join(raiz, ruta), 'utf-8') }));
    expect(hallazgosDe(lecturas)).toEqual([]);
  });

  it('el escaneo detecta URLs y correos fuera de la lista permitida', () => {
    const hallazgos = hallazgosDe([
      {
        ruta: 'a.astro',
        texto:
          'https://www.mercadolibre.cl/x https://www.instagram.com/y https://schema.org/z contacto@dominio.cl https://www.w3.org/2000/svg https://falso-w3.org/w https://schema.org.falso.cl/s',
      },
    ]);
    expect(hallazgos).toEqual([
      'a.astro: https://www.mercadolibre.cl/x',
      'a.astro: https://www.instagram.com/y',
      'a.astro: https://falso-w3.org/w',
      'a.astro: https://schema.org.falso.cl/s',
      'a.astro: contacto@dominio.cl',
    ]);
  });

  it('Textos de CTA: ningún componente, layout ni página los escribe como literal', () => {
    const textos = clavesDeCta.map((clave) => (site as unknown as Record<string, string>)[clave]);
    textos.forEach((texto, indice) => expect(texto, clavesDeCta[indice]).toEqual(expect.any(String)));
    expect(textos.every((texto) => texto.length > 0)).toBe(true);
    const lecturas = fuentes.map((ruta) => ({ ruta, texto: readFileSync(path.join(raiz, ruta), 'utf-8') }));
    expect(literalesDe(lecturas, textos)).toEqual([]);
  });

  it('el escaneo de CTA detecta un literal en un archivo', () => {
    const lecturas = [
      { ruta: 'limpio.astro', texto: '<a>{site.ctaHeader}</a>' },
      { ruta: 'sucio.astro', texto: '<a>Seguir la tienda en Mercado Libre</a>' },
    ];
    expect(literalesDe(lecturas, ['Seguir la tienda en Mercado Libre', 'Ver en Mercado Libre'])).toEqual([
      'sucio.astro: Seguir la tienda en Mercado Libre',
    ]);
  });

  it('Textos de CTA: el cupón usa ctaCupon', async () => {
    const html = await renderPromociones({ cupones: [cupon('vigente')], campanas: [] });
    expect(textoDelEnlace(tarjeta(html, 'Cupón de prueba'), site.mercadolibre.paginaOficial)).toEqual([site.ctaCupon]);
  });

  it('Textos de CTA: la campaña usa ctaHeader', async () => {
    const html = await renderPromociones({ cupones: [], campanas: [campana('vigente')] });
    expect(textoDelEnlace(tarjeta(html, 'Campaña de prueba'), site.mercadolibre.tienda)).toEqual([site.ctaHeader]);
  });

  it('Textos de CTA: sin publicables la página usa ctaHeader', async () => {
    const html = await renderPromociones({ cupones: [], campanas: [] });
    expect(textoDelEnlace(html, site.mercadolibre.tienda)).toEqual([site.ctaHeader]);
  });

  it('Textos de CTA: las reseñas de la home usan ctaHeader', async () => {
    const html = await contenedor.renderToString(Resenas);
    expect(textoDelEnlace(html, resenas.mercadolibre.url)).toEqual([site.ctaHeader]);
  });
});
