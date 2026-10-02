import { describe, expect, it } from 'vitest';
import { buildOffer, buildProduct } from '../../../src/lib/seo';
import { site } from '../../../src/lib/site';

const ficha = {
  titulo: 'Producto de prueba',
  resumen: 'Descripción de prueba.',
  permalink: 'https://articulo.mercadolibre.cl/MLC-1-prueba-_JM',
  precioReferencial: 12490,
  condicion: 'new' as const,
};
const imagenes = ['https://agassoluciones.cl/_astro/a.webp', 'https://agassoluciones.cl/_astro/b.webp'];

describe('[seo-geo] Producto simple', () => {
  it('Producto con nombre, descripción, marca, imágenes y una oferta', () => {
    const producto = JSON.parse(JSON.stringify(buildProduct(ficha, imagenes)));
    expect(producto['@type']).toBe('Product');
    expect(producto.name).toBe(ficha.titulo);
    expect(producto.description).toBe(ficha.resumen);
    expect(producto.brand).toEqual({ '@type': 'Brand', name: site.nombre });
    expect(producto.image).toEqual(imagenes);
    expect(producto.offers).toEqual(JSON.parse(JSON.stringify(buildOffer({ url: ficha.permalink, precio: 12490, condicion: 'new' }))));
  });

  it('Sin reseñas', () => {
    expect(JSON.parse(JSON.stringify(buildProduct(ficha, imagenes)))).not.toHaveProperty('aggregateRating');
    const sinCantidad = buildProduct({ ...ficha, reviews: { promedio: 4.8, cantidad: 0 } }, imagenes);
    expect(JSON.parse(JSON.stringify(sinCantidad))).not.toHaveProperty('aggregateRating');
  });

  it('Con reseñas', () => {
    const producto = JSON.parse(JSON.stringify(buildProduct({ ...ficha, reviews: { promedio: 4.8, cantidad: 10 } }, imagenes)));
    expect(producto.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 4.8, reviewCount: 10 });
  });
});
