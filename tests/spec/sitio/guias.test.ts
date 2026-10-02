import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';

const raiz = path.resolve(import.meta.dirname, '../../..');
const fecha = /^\d{4}-\d{2}-\d{2}$/;

const frontmatterDe = (directorio: string): Record<string, unknown>[] =>
  readdirSync(path.join(raiz, directorio))
    .filter((archivo) => archivo.endsWith('.md'))
    .map((archivo) => matter(readFileSync(path.join(raiz, directorio, archivo), 'utf-8')).data);

const esTexto = (valor: unknown): valor is string => typeof valor === 'string' && valor.length > 0;

const problemasDe = (guia: Record<string, unknown>, slugsDeFichas: string[]): string[] => {
  const problemas: string[] = [];
  for (const campo of ['titulo', 'slug', 'descripcion']) {
    if (!esTexto(guia[campo])) problemas.push(`${campo} no es un texto`);
  }
  if (guia.metaTitulo !== undefined && !esTexto(guia.metaTitulo)) problemas.push('metaTitulo no es un texto');
  for (const campo of ['publicado', 'actualizado']) {
    if (typeof guia[campo] !== 'string' || !fecha.test(guia[campo])) problemas.push(`${campo} no es AAAA-MM-DD`);
  }
  if (typeof guia.publicado === 'string' && typeof guia.actualizado === 'string' && guia.actualizado < guia.publicado) {
    problemas.push('actualizado es anterior a publicado');
  }
  if (!Array.isArray(guia.productosRelacionados)) {
    problemas.push('productosRelacionados no es una lista');
  } else {
    for (const slug of guia.productosRelacionados) {
      if (!slugsDeFichas.includes(slug)) problemas.push(`productosRelacionados cita el slug sin ficha ${slug}`);
    }
  }
  return problemas;
};

const guiaValida = {
  titulo: 'Guía',
  slug: 'guia',
  descripcion: 'Descripción',
  publicado: '2031-03-10',
  actualizado: '2031-03-12',
  productosRelacionados: ['ficha-a', 'ficha-b'],
};

const fichas = ['ficha-a', 'ficha-b'];

describe('[sitio] Guías', () => {
  it('Slug inexistente', () => {
    expect(problemasDe({ ...guiaValida, productosRelacionados: ['ficha-a', 'no-existe'] }, fichas)).toEqual([
      'productosRelacionados cita el slug sin ficha no-existe',
    ]);
  });

  it('cada guía del repo cumple la tabla de campos y cita solo slugs que son fichas', () => {
    const guias = frontmatterDe('content/guias');
    const slugsDeFichas = frontmatterDe('content/productos').map((ficha) => ficha.slug as string);
    expect(guias.length).toBeGreaterThan(0);
    expect(slugsDeFichas.length).toBeGreaterThan(0);
    for (const guia of guias) {
      expect(problemasDe(guia, slugsDeFichas), String(guia.slug)).toEqual([]);
    }
  });

  it('la tabla de campos acepta una guía válida y con metaTitulo', () => {
    expect(problemasDe(guiaValida, fichas)).toEqual([]);
    expect(problemasDe({ ...guiaValida, metaTitulo: 'Título para buscadores' }, fichas)).toEqual([]);
  });

  it('la tabla de campos rechaza tipos y fechas inválidos', () => {
    expect(problemasDe({ ...guiaValida, titulo: 3 }, fichas)).toEqual(['titulo no es un texto']);
    expect(problemasDe({ ...guiaValida, metaTitulo: 3 }, fichas)).toEqual(['metaTitulo no es un texto']);
    expect(problemasDe({ ...guiaValida, publicado: '10-03-2031' }, fichas)).toEqual(['publicado no es AAAA-MM-DD']);
    expect(problemasDe({ ...guiaValida, actualizado: '2031-03-09' }, fichas)).toEqual([
      'actualizado es anterior a publicado',
    ]);
    expect(problemasDe({ ...guiaValida, productosRelacionados: 'ficha-a' }, fichas)).toEqual([
      'productosRelacionados no es una lista',
    ]);
  });
});
