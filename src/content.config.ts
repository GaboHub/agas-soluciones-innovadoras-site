import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const paginas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/paginas' }),
  schema: z.object({
    titulo: z.string(),
    slug: z.string(),
    tipo: z.enum(['categoria']).optional(),
    emoji: z.string().optional(),
  }),
});

const productos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/productos' }),
  schema: z.object({
    titulo: z.string(),
    slug: z.string(),
    categoria: z.string(),
    tipo: z.enum(['simple', 'variantes', 'familia']),
    emoji: z.string(),
    permalink: z.string().url(),
    precioReferencial: z.number().int().positive(),
    fechaPrecio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    resumen: z.string(),
    imagenes: z.array(z.string()),
    caracteristicas: z.array(z.string()).optional(),
    incluye: z.array(z.string()).optional(),
    faqs: z
      .array(
        z.object({
          pregunta: z.string(),
          respuesta: z.string(),
        }),
      )
      .optional(),
    reviews: z
      .object({
        promedio: z.number(),
        cantidad: z.number().int(),
        distribucion: z.record(z.string(), z.number()),
        comentarios: z.array(
          z.object({
            estrellas: z.number().int().min(1).max(5),
            titulo: z.string(),
            texto: z.string(),
            fecha: z.string(),
          }),
        ),
      })
      .optional(),
    variantes: z
      .array(
        z.object({
          nombre: z.string(),
          atributo: z.string(),
          link: z.string().url(),
          imagenes: z.array(z.string()),
        }),
      )
      .optional(),
    miembros: z
      .array(
        z.object({
          titulo: z.string(),
          link: z.string().url(),
          precio: z.number().int(),
          imagenes: z.array(z.string()),
          atributos: z.record(z.string(), z.string()),
        }),
      )
      .optional(),
    grupos: z
      .array(
        z.object({
          diseno: z.string(),
          colores: z.array(
            z.object({
              color: z.string(),
              link: z.string().url(),
              imagenes: z.array(z.string()),
            }),
          ),
        }),
      )
      .optional(),
  }),
});

const guias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/guias' }),
  schema: z.object({
    titulo: z.string(),
    slug: z.string(),
    descripcion: z.string(),
    emoji: z.string(),
    productosRelacionados: z.array(z.string()),
  }),
});

export const collections = { paginas, productos, guias };
