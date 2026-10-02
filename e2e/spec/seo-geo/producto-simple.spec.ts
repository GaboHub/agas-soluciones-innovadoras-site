import { expect, test } from '@playwright/test';
import { bloquesJsonLd } from '../_jsonld';
import { muestras } from '../_muestras';

const simples = muestras.fichas.filter((ficha) => ficha.tipo === 'simple');

test.describe('[seo-geo] Producto simple', () => {
  test('Fichas simples con Product, una oferta y reseñas solo si existen', async ({ page }) => {
    expect(simples.length).toBeGreaterThan(0);
    for (const ficha of simples) {
      await page.goto(`/productos/${ficha.slug}/`);
      const bloques = await bloquesJsonLd(page);
      expect(bloques.filter((bloque) => bloque['@type'] === 'ProductGroup'), ficha.slug).toHaveLength(0);
      const producto = bloques.find((bloque) => bloque['@type'] === 'Product')!;
      expect(producto.name, ficha.slug).toBe(ficha.titulo);
      expect(producto.description, ficha.slug).toBeTruthy();
      expect(producto.brand['@type'], ficha.slug).toBe('Brand');
      expect(producto.image.length, ficha.slug).toBeGreaterThan(0);
      expect(producto.image.length, ficha.slug).toBeLessThanOrEqual(4);
      for (const imagen of producto.image) expect(imagen, ficha.slug).toMatch(/^https:\/\/agassoluciones\.cl\//);
      expect(producto.offers).toMatchObject({
        '@type': 'Offer',
        url: ficha.permalink,
        price: ficha.precioReferencial,
        priceCurrency: 'CLP',
        availability: 'https://schema.org/InStock',
        seller: { '@id': 'https://agassoluciones.cl/#organizacion' },
      });
      const conResenas = (ficha.reviews?.cantidad ?? 0) > 0;
      if (conResenas) {
        expect(producto.aggregateRating, ficha.slug).toEqual({
          '@type': 'AggregateRating',
          ratingValue: ficha.reviews.promedio,
          reviewCount: ficha.reviews.cantidad,
        });
      } else {
        expect(producto, ficha.slug).not.toHaveProperty('aggregateRating');
      }
    }
  });
});
