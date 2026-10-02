import { describe, expect, it } from 'vitest';
import { buildArticle, buildOrganization } from '../../../src/lib/seo';

describe('[seo-geo] Article de cada guía', () => {
  it('Fechas de la guía', () => {
    const organizacion = buildOrganization('https://agassoluciones.cl/_astro/logo.png');
    const url = 'https://agassoluciones.cl/guias/guia-de-prueba/';
    const articulo = JSON.parse(
      JSON.stringify(
        buildArticle({
          headline: 'Guía de prueba',
          description: 'Descripción de la guía',
          publisher: organizacion,
          url,
          publicado: '2026-08-10',
          actualizado: '2026-09-02',
        }),
      ),
    );
    expect(articulo).toMatchObject({
      '@type': 'Article',
      headline: 'Guía de prueba',
      description: 'Descripción de la guía',
      inLanguage: 'es-CL',
      mainEntityOfPage: url,
      datePublished: '2026-08-10',
      dateModified: '2026-09-02',
    });
    expect(articulo.publisher).toEqual(JSON.parse(JSON.stringify(organizacion)));
  });
});
