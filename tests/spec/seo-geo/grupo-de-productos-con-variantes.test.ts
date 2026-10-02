import { describe, expect, it } from 'vitest';
import { construirGruposFicha, type ProductoFicha } from '../../../src/lib/ficha';
import { buildProductGroup } from '../../../src/lib/seo';
import { site } from '../../../src/lib/site';

const enlace = (nombre: string) => `https://articulo.mercadolibre.cl/MLC-${encodeURIComponent(nombre)}-_JM`;
const ficha = { slug: 'ficha-de-prueba', resumen: 'Descripción de prueba.', condicion: 'new' as const };
const imagenes = ['https://agassoluciones.cl/_astro/principal.webp'];

const imagenDeOpcion = (link: string) => `https://agassoluciones.cl/_astro/${link.slice(-12)}.webp`;

const generar = (datos: ProductoFicha, extra: Partial<Parameters<typeof buildProductGroup>[0]> = {}) => {
  const resultado = construirGruposFicha(datos);
  const grupo = buildProductGroup(
    {
      ...ficha,
      titulo: datos.titulo,
      permalink: datos.permalink,
      precioReferencial: datos.precioReferencial,
      ...extra,
    },
    {
      agrupada: resultado.agrupada,
      gruposFicha: resultado.gruposFicha.map((g) => ({
        nombre: g.nombre,
        opciones: g.opciones.map((o) => ({ ...o, imagen: imagenDeOpcion(o.link) })),
      })),
    },
    imagenes,
  );
  return { resultado, json: JSON.parse(JSON.stringify(grupo)) };
};

const familiaAgrupada = (ejes: { etiquetaGrupo?: string; etiquetaOpcion?: string }): ProductoFicha => ({
  titulo: 'Fundas de prueba',
  permalink: enlace('base'),
  precioReferencial: 9990,
  imagenes: ['base.jpg'],
  ...ejes,
  grupos: ['Camo', 'Skulls'].map((diseno) => ({
    diseno,
    colores: Array.from({ length: 9 }, (_, indice) => ({
      color: `Color ${indice + 1}`,
      link: enlace(`${diseno}-${indice + 1}`),
      imagenes: [`${diseno}-${indice + 1}.jpg`],
    })),
  })),
});

describe('[seo-geo] Grupo de productos con variantes', () => {
  it('Familia agrupada', () => {
    const { json } = generar(familiaAgrupada({}), { reviews: { promedio: 4.5, cantidad: 3 } });
    expect(json['@type']).toBe('ProductGroup');
    expect(json.name).toBe('Fundas de prueba');
    expect(json.description).toBe(ficha.resumen);
    expect(json.brand).toEqual({ '@type': 'Brand', name: site.nombre });
    expect(json.image).toEqual(imagenes);
    expect(json.productGroupID).toBe('ficha-de-prueba');
    expect(json.variesBy).toEqual(['https://schema.org/pattern', 'https://schema.org/color']);
    expect(json.aggregateRating).toEqual({ '@type': 'AggregateRating', ratingValue: 4.5, reviewCount: 3 });
    expect(json.hasVariant).toHaveLength(18);
    const [primera] = json.hasVariant;
    expect(primera).toMatchObject({
      '@type': 'Product',
      name: 'Fundas de prueba (Camo, Color 1)',
      pattern: 'Camo',
      color: 'Color 1',
      offers: { '@type': 'Offer', url: enlace('Camo-1'), price: 9990, priceCurrency: 'CLP' },
    });
    for (const variante of json.hasVariant as { image: string; offers: { url: string } }[]) {
      expect(variante.image, variante.offers.url).toBe(imagenDeOpcion(variante.offers.url));
    }
    expect(new Set(json.hasVariant.map((v: { image: string }) => v.image)).size).toBe(18);
    expect(json.hasVariant[17]).toMatchObject({ pattern: 'Skulls', color: 'Color 9', offers: { url: enlace('Skulls-9') } });
    expect(new Set(json.hasVariant.map((v: { offers: { url: string } }) => v.offers.url)).size).toBe(18);
  });

  it('Sin reseñas, el ProductGroup no trae aggregateRating', () => {
    expect(generar(familiaAgrupada({})).json).not.toHaveProperty('aggregateRating');
  });

  it('Ejes sin equivalente', () => {
    const { json } = generar(familiaAgrupada({ etiquetaGrupo: 'Funda', etiquetaOpcion: 'Grips' }));
    expect(json).not.toHaveProperty('variesBy');
    expect(json.hasVariant[0].name).toBe('Fundas de prueba (Camo, Color 1)');
    for (const variante of json.hasVariant) {
      expect(variante).not.toHaveProperty('color');
      expect(variante).not.toHaveProperty('pattern');
    }
  });

  it('Variantes por color', () => {
    const { json } = generar({
      titulo: 'Kit de prueba',
      permalink: enlace('base'),
      precioReferencial: 39990,
      imagenes: ['base.jpg'],
      variantes: ['Negro', 'Azul', 'Rojo'].map((nombre) => ({
        nombre,
        atributo: 'Color',
        link: enlace(nombre),
        imagenes: [`${nombre}.jpg`],
      })),
    });
    expect(json.variesBy).toEqual(['https://schema.org/color']);
    expect(json.hasVariant).toHaveLength(3);
    expect(json.hasVariant.map((v: { name: string; color: string }) => [v.name, v.color])).toEqual([
      ['Kit de prueba (Negro)', 'Negro'],
      ['Kit de prueba (Azul)', 'Azul'],
      ['Kit de prueba (Rojo)', 'Rojo'],
    ]);
  });

  it('Un atributo que no es Color no se declara', () => {
    const { json } = generar({
      titulo: 'Kit de prueba',
      permalink: enlace('base'),
      precioReferencial: 8590,
      imagenes: ['base.jpg'],
      variantes: [{ nombre: 'Camo / Blanco', atributo: 'Color / Nombre del diseño', link: enlace('x'), imagenes: ['x.jpg'] }],
    });
    expect(json).not.toHaveProperty('variesBy');
    expect(json.hasVariant[0]).not.toHaveProperty('color');
    expect(json.hasVariant[0].name).toBe('Kit de prueba (Camo / Blanco)');
  });

  it('Miembros de familia: precio y link propios y color desde sus atributos', () => {
    const { json } = generar({
      titulo: 'Audífonos de prueba',
      permalink: enlace('base'),
      precioReferencial: 7990,
      imagenes: ['base.jpg'],
      miembros: [
        { titulo: 'Audífonos Azul', link: enlace('azul'), precio: 7990, imagenes: ['a.jpg'], atributos: { color: 'Azul' } },
        { titulo: 'Audífonos Rosa', link: enlace('rosa'), precio: 8990, imagenes: ['r.jpg'], atributos: { color: 'Rosa' } },
      ],
    });
    expect(json.variesBy).toEqual(['https://schema.org/color']);
    expect(json.hasVariant.map((v: { color: string; offers: { price: number; url: string } }) => [v.color, v.offers.price, v.offers.url])).toEqual([
      ['Azul', 7990, enlace('azul')],
      ['Rosa', 8990, enlace('rosa')],
    ]);
  });

  it('Un eje que no tienen todas las opciones no se declara', () => {
    const { json } = generar({
      titulo: 'Audífonos de prueba',
      permalink: enlace('base'),
      precioReferencial: 7990,
      imagenes: ['base.jpg'],
      miembros: [
        { titulo: 'Audífonos Azul', link: enlace('azul'), precio: 7990, imagenes: ['a.jpg'], atributos: { color: 'Azul' } },
        { titulo: 'Audífonos sin color', link: enlace('sc'), precio: 7990, imagenes: ['s.jpg'], atributos: {} },
      ],
    });
    expect(json).not.toHaveProperty('variesBy');
    for (const variante of json.hasVariant) expect(variante).not.toHaveProperty('color');
  });
});
