import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { borrar, crearContexto, crearRaizCurada, generar, generarAparte, leerFicha } from './_arnes';

type Reviews = {
  promedio: number;
  cantidad: number;
  distribucion: Record<string, number>;
  comentarios: { estrellas: number; titulo: string; texto: string; fecha: string }[];
};

let contexto: string;
let raiz: string;

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  await generar({ contexto, raiz });
});

afterAll(() => {
  borrar(contexto, raiz);
});

type Miembro = {
  item: string;
  promedio: string;
  cantidad: number;
  distribucion: Record<number, number>;
  estrellas: number;
  titulo: string;
  texto: string;
  fecha: string;
};

const bloqueDeMiembro = (miembro: Miembro) => {
  const distribucion = Object.entries(miembro.distribucion)
    .map(([estrella, cuenta]) => `- ${estrella}★: ${cuenta}`)
    .join('\n');
  return [
    `## Reseñas Fixture Color ${miembro.item}`,
    '',
    `- **ML Item ID:** ${miembro.item}`,
    `- **Link:** https://articulo.mercadolibre.cl/MLC-${miembro.item.slice(3)}-resenas-fixture-color-${miembro.item.toLowerCase()}-_JM`,
    '- **Estado:** active',
    '- **Condición:** new',
    '- **Catálogo:** No',
    '- **Familia ML:** Reseñas Fixture (user_product_id MLCU900)',
    '- **Precio:** $5.000',
    '- **Stock disponible:** 10',
    '- **Vendidos:** 1',
    '',
    '### Descripción',
    '',
    'Producto de prueba.',
    '',
    '### Reviews',
    '',
    `${miembro.promedio}★ — ${miembro.cantidad} reviews, 1 con comentario`,
    '',
    distribucion,
    '',
    `- ${'★'.repeat(miembro.estrellas)} «${miembro.titulo}» — ${miembro.texto} (${miembro.fecha})`,
    '',
    '### Imágenes',
    '',
    `- ${miembro.item}-miembro/imagenes/01-100-${miembro.item}_1.jpg`,
    '',
  ].join('\n');
};

const escribirFamilia = async (carpeta: string, miembros: Miembro[]) => {
  const base = path.join(contexto, 'publicaciones', carpeta);
  mkdirSync(base, { recursive: true });
  writeFileSync(
    path.join(base, 'publicacion.md'),
    ['# Familia: Reseñas Fixture', '', `- **Miembros:** ${miembros.length}`, '', ...miembros.map(bloqueDeMiembro)].join('\n'),
  );
  for (const { item } of miembros) {
    const ruta = path.join(base, `${item}-miembro/imagenes/01-100-${item}_1.jpg`);
    mkdirSync(path.dirname(ruta), { recursive: true });
    await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 10, g: 20, b: 30 } } }).jpeg().toFile(ruta);
  }
};

const reviewsAparte = async (carpeta: string): Promise<Reviews> => {
  const corrida = await generarAparte([{ prefijo: carpeta, slug: 'resenas-fixture', titulo: 'Reseñas Fixture' }], contexto);
  return corrida.ficha('resenas-fixture').data.reviews as Reviews;
};

const reviewsDe = (slug: string) => leerFicha(raiz, slug).data.reviews as Reviews | undefined;

describe('[catalogo] Reseñas de familia deduplicadas por firma', () => {
  it('Bloque replicado', () => {
    const reviews = reviewsDe('replicada-fixture');
    expect(reviews?.cantidad).toBe(1);
    expect(reviews?.promedio).toBe(5);
    expect(reviews?.comentarios).toHaveLength(1);
  });

  it('Bloques distintos', () => {
    const reviews = reviewsDe('audifonos-fixture');
    expect(reviews?.cantidad).toBe(2);
    expect(reviews?.promedio).toBe(4.5);
    expect(reviews?.distribucion).toEqual({ '5': 1, '4': 1 });
    expect(reviews?.comentarios.map((comentario) => comentario.estrellas)).toEqual([5, 4]);
  });

  it('Miembro de catálogo', () => {
    const reviews = reviewsDe('audifonos-fixture');
    expect(reviews?.cantidad).toBe(2);
    expect(reviews?.distribucion['5']).toBe(1);
  });

  it('Firma completa y promedio ponderado', async () => {
    const miembros: Miembro[] = [
      { item: 'MLC4001', promedio: '5.0', cantidad: 3, distribucion: { 5: 3 }, estrellas: 5, titulo: 'Genial uno', texto: 'Texto uno.', fecha: '2031-03-01' },
      { item: 'MLC4002', promedio: '5.0', cantidad: 1, distribucion: { 5: 1 }, estrellas: 5, titulo: 'Genial dos', texto: 'Texto dos.', fecha: '2031-03-02' },
      { item: 'MLC4003', promedio: '3.0', cantidad: 2, distribucion: { 3: 2 }, estrellas: 3, titulo: 'Regular', texto: 'Texto tres.', fecha: '2031-03-03' },
      { item: 'MLC4004', promedio: '1.0', cantidad: 1, distribucion: { 1: 1 }, estrellas: 1, titulo: 'Malo', texto: 'Texto cuatro.', fecha: '2031-03-04' },
      { item: 'MLC4005', promedio: '5.0', cantidad: 3, distribucion: { 5: 3 }, estrellas: 5, titulo: 'Genial uno', texto: 'Texto uno.', fecha: '2031-03-01' },
    ];
    await escribirFamilia('familia-resenas-fixture', miembros);
    const reviews = await reviewsAparte('familia-resenas-fixture');
    expect(reviews.cantidad).toBe(7);
    expect(reviews.promedio).toBe(3.9);
    expect(reviews.distribucion).toEqual({ '5': 4, '3': 2, '1': 1 });
    expect(reviews.comentarios.map((comentario) => comentario.titulo)).toEqual(['Genial uno', 'Genial dos', 'Regular', 'Malo']);
  });

  const base: Miembro = {
    item: 'MLC4101',
    promedio: '4.5',
    cantidad: 2,
    distribucion: { 5: 1, 4: 1 },
    estrellas: 5,
    titulo: 'Bueno',
    texto: 'Texto base.',
    fecha: '2031-03-01',
  };

  const diferencias: [string, Partial<Miembro>][] = [
    ['solo el promedio', { promedio: '4.0' }],
    ['solo la cantidad', { cantidad: 3 }],
    ['solo la distribución', { distribucion: { 5: 1, 3: 1 } }],
    ['solo la estrella del comentario', { estrellas: 4 }],
    ['solo el título del comentario', { titulo: 'Muy bueno' }],
    ['solo el texto del comentario', { texto: 'Otro texto.' }],
    ['solo la fecha del comentario', { fecha: '2031-03-02' }],
  ];

  it.each(diferencias)('Bloques que difieren en %s no se deduplican', async (nombre, cambio) => {
    const carpeta = `familia-resenas-par-${nombre.replaceAll(' ', '-')}`;
    const otro = { ...base, ...cambio, item: 'MLC4102' };
    await escribirFamilia(carpeta, [base, otro]);
    const reviews = await reviewsAparte(carpeta);
    expect(reviews.cantidad).toBe(base.cantidad + otro.cantidad);
    expect(reviews.comentarios).toHaveLength(2);
    const esperada = { ...base.distribucion };
    for (const [estrella, cuenta] of Object.entries(otro.distribucion)) {
      esperada[Number(estrella)] = (esperada[Number(estrella)] ?? 0) + cuenta;
    }
    expect(reviews.distribucion).toEqual(esperada);
  });

  it('Bloques idénticos se deduplican aunque cambie el miembro', async () => {
    const carpeta = 'familia-resenas-par-identicos';
    await escribirFamilia(carpeta, [base, { ...base, item: 'MLC4102' }]);
    const reviews = await reviewsAparte(carpeta);
    expect(reviews.cantidad).toBe(base.cantidad);
    expect(reviews.comentarios).toHaveLength(1);
  });
});
