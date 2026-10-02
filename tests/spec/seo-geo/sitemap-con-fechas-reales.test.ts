import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { leerFuentesFechadas, lastmodPorRuta } from '../../../src/lib/lastmod';
import { muestras } from '../../../e2e/spec/_muestras';
import site from '../../../src/data/site.json';

const fichas = [
  { slug: 'a', fechaPrecio: '2026-10-01' },
  { slug: 'b', fechaPrecio: '2026-09-20' },
  { slug: 'c', fechaPrecio: '2026-08-15' },
];
const guias = [
  { slug: 'g1', actualizado: '2026-09-02' },
  { slug: 'g2', actualizado: '2026-07-01' },
];
const categorias = [
  { slug: 'x', productos: ['b', 'c'] },
  { slug: 'y', productos: ['a'] },
];
const mapa = lastmodPorRuta({ fichas, guias, categorias });

describe('[seo-geo] Sitemap con fechas reales', () => {
  it('Ficha', () => {
    expect(mapa['/productos/a/']).toBe('2026-10-01');
    expect(mapa['/productos/b/']).toBe('2026-09-20');
    expect(mapa['/productos/c/']).toBe('2026-08-15');
  });

  it('Páginas de listado: la mayor fechaPrecio de las fichas que listan', () => {
    expect(mapa['/']).toBe('2026-10-01');
    expect(mapa['/productos/']).toBe('2026-10-01');
    expect(mapa['/categorias/x/']).toBe('2026-09-20');
    expect(mapa['/categorias/y/']).toBe('2026-10-01');
  });

  it('Guías: su actualizado y la mayor para el índice', () => {
    expect(mapa['/guias/g1/']).toBe('2026-09-02');
    expect(mapa['/guias/g2/']).toBe('2026-07-01');
    expect(mapa['/guias/']).toBe('2026-09-02');
  });

  it('Página sin fuente fechada', () => {
    for (const ruta of ['/contacto/', '/promociones/', '/preguntas-frecuentes/', '/terminos-y-condiciones/']) {
      expect(mapa).not.toHaveProperty(ruta);
    }
    expect(Object.keys(mapa).sort()).toEqual(
      ['/', '/productos/', '/productos/a/', '/productos/b/', '/productos/c/', '/categorias/x/', '/categorias/y/', '/guias/', '/guias/g1/', '/guias/g2/'].sort(),
    );
  });

  it('Sin guías no hay lastmod para /guias/', () => {
    expect(lastmodPorRuta({ fichas, guias: [], categorias })).not.toHaveProperty('/guias/');
  });

  it('Lee las fuentes fechadas de content/ y site.json', () => {
    const fuentes = leerFuentesFechadas(path.resolve(import.meta.dirname, '../../..'));
    expect(fuentes.fichas.map((ficha) => ficha.slug).sort()).toEqual(muestras.fichas.map((ficha) => ficha.slug as string).sort());
    expect(fuentes.guias.map((guia) => guia.actualizado).sort()).toEqual(muestras.guias.map((guia) => guia.actualizado as string).sort());
    expect(fuentes.categorias).toEqual(site.categorias.map(({ slug, productos }) => ({ slug, productos })));
  });
});
