import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import site from '../../../src/data/site.json';
import { borrar, crearContexto, crearRaizCurada, generar, generarAparte, leerFicha, RAIZ_REPO, slugsGenerados } from './_arnes';

vi.mock('astro:content', async () => {
  const { z } = await import('astro/zod');
  return { defineCollection: (coleccion: unknown) => coleccion, z };
});

const { collections } = await import('../../../src/content.config');
const esquema = (collections.productos as unknown as { schema: { safeParse: (valor: unknown) => { success: boolean } } }).schema;

const fichaValida = {
  titulo: 'Ficha',
  slug: 'ficha',
  categoria: 'audio',
  tipo: 'simple',
  permalink: 'https://articulo.mercadolibre.cl/MLC-1-x',
  condicion: 'new',
  precioReferencial: 1000,
  fechaPrecio: '2031-03-09',
  resumen: 'Resumen',
  imagenes: ['productos/ficha/01.webp'],
};

const reviewsValidas = {
  promedio: 4.5,
  cantidad: 2,
  distribucion: { '5': 1, '4': 1 },
  comentarios: [{ estrellas: 5, titulo: 't', texto: 'x', fecha: '2031-01-01' }],
};

let contexto: string;
let raiz: string;
let fichas: Record<string, Record<string, unknown>>;

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  await generar({ contexto, raiz });
  fichas = Object.fromEntries(slugsGenerados(raiz).map((slug) => [slug, leerFicha(raiz, slug).data]));
});

afterAll(() => {
  borrar(contexto, raiz);
});

const categoriasDelSitio = site.categorias.map((categoria) => categoria.slug);

describe('[catalogo] Frontmatter conforme al contrato', () => {
  it('una ficha válida pasa el esquema', () => {
    expect(esquema.safeParse(fichaValida).success).toBe(true);
    expect(esquema.safeParse({ ...fichaValida, reviews: reviewsValidas }).success).toBe(true);
  });

  it('Precio inválido', () => {
    for (const precio of [0, -5, 10.5]) {
      expect(esquema.safeParse({ ...fichaValida, precioReferencial: precio }).success, String(precio)).toBe(false);
    }
  });

  it('Reseñas fuera de rango', () => {
    for (const promedio of [6, 0.5, 0]) {
      expect(esquema.safeParse({ ...fichaValida, reviews: { ...reviewsValidas, promedio } }).success, String(promedio)).toBe(false);
    }
    const comentarioFuera = { ...reviewsValidas.comentarios[0], estrellas: 6 };
    expect(esquema.safeParse({ ...fichaValida, reviews: { ...reviewsValidas, comentarios: [comentarioFuera] } }).success).toBe(false);
  });

  it('campos obligatorios: condición, fecha y permalink', () => {
    expect(esquema.safeParse({ ...fichaValida, condicion: 'roto' }).success).toBe(false);
    expect(esquema.safeParse({ ...fichaValida, fechaPrecio: '09-03-2031' }).success).toBe(false);
    expect(esquema.safeParse({ ...fichaValida, permalink: 'no-es-url' }).success).toBe(false);
    const { condicion: _omitida, ...sinCondicion } = fichaValida;
    expect(esquema.safeParse(sinCondicion).success).toBe(false);
  });

  it('las fichas del repo validan el esquema y su categoría existe en site.json', () => {
    const archivos = readdirSync(path.join(RAIZ_REPO, 'content/productos')).filter((archivo) => archivo.endsWith('.md'));
    expect(archivos.length).toBeGreaterThan(0);
    for (const archivo of archivos) {
      const datos = matter(readFileSync(path.join(RAIZ_REPO, 'content/productos', archivo), 'utf-8')).data;
      expect(esquema.safeParse(datos).success, archivo).toBe(true);
      expect('emoji' in datos, `${archivo}.emoji`).toBe(false);
      expect(categoriasDelSitio, archivo).toContain(datos.categoria);
      for (const imagen of datos.imagenes as string[]) {
        expect(existsSync(path.join(RAIZ_REPO, 'src/assets/images', imagen)), `${archivo}: ${imagen}`).toBe(true);
      }
    }
  });

  it('las fichas generadas validan el esquema y su categoría existe en site.json', () => {
    const sinCategoria = Object.entries(fichas).filter(([, datos]) => datos.categoria === 'otros');
    expect(sinCategoria.map(([slug]) => slug).sort()).toEqual(['funda-x', 'funda-x-2', 'lampara']);
    for (const [slug, datos] of Object.entries(fichas)) {
      expect(esquema.safeParse(datos).success, slug).toBe(true);
      expect('emoji' in datos, `${slug}.emoji`).toBe(false);
      if (datos.categoria !== 'otros') expect(categoriasDelSitio, slug).toContain(datos.categoria);
    }
  });

  it('los campos opcionales solo aparecen cuando corresponden', () => {
    for (const [slug, datos] of Object.entries(fichas)) {
      for (const campo of ['caracteristicas', 'incluye', 'faqs']) {
        if (campo in datos) expect((datos[campo] as unknown[]).length, `${slug}.${campo}`).toBeGreaterThan(0);
      }
      expect('variantes' in datos, `${slug}.variantes`).toBe(datos.tipo === 'variantes');
      expect('miembros' in datos, `${slug}.miembros`).toBe(slug === 'audifonos-fixture' || slug === 'replicada-fixture');
      expect('grupos' in datos, `${slug}.grupos`).toBe(slug === 'kit-fundas-fixture');
      expect('etiquetaGrupo' in datos, `${slug}.etiquetaGrupo`).toBe(false);
    }
    expect(fichas['lamina-fixture']).not.toHaveProperty('reviews');
    expect(fichas['tres-cinco']).toHaveProperty('reviews');
  });

  it('las etiquetas solo salen de una entrada que las declara', async () => {
    const conEtiquetas = await generarAparte(
      [
        {
          prefijo: 'familia-kit-fundas-fixture',
          slug: 'kit-etiquetado',
          titulo: 'Kit Fundas Fixture Diseños Control PS5',
          agruparPorDiseno: true,
          etiquetas: { grupo: 'Funda', opcion: 'Grips' },
        },
      ],
      contexto,
    );
    const datos = conEtiquetas.ficha('kit-etiquetado').data;
    expect(esquema.safeParse(datos).success).toBe(true);
    expect(datos.etiquetaGrupo).toBe('Funda');
  });
});
