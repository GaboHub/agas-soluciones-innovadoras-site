import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import site from '../../src/data/site.json' with { type: 'json' };

const raiz = path.resolve(import.meta.dirname, '../..');

const frontmatter = (directorio: string) =>
  readdirSync(path.join(raiz, directorio))
    .filter((archivo) => archivo.endsWith('.md'))
    .map((archivo) => matter(readFileSync(path.join(raiz, directorio, archivo), 'utf-8')).data);

const fichas = frontmatter('content/productos');
const guias = frontmatter('content/guias');

const ordenDeCatalogo = site.categorias.flatMap((categoria) => categoria.productos);
const enOrdenDeCatalogo = [...fichas].sort(
  (a, b) => ordenDeCatalogo.indexOf(a.slug) - ordenDeCatalogo.indexOf(b.slug),
);

const primera = <T>(items: T[], descripcion: string): T => {
  if (items.length === 0) throw new Error(`No hay ${descripcion} para usar como muestra`);
  return items[0];
};

const fichaConGrupos = primera(
  enOrdenDeCatalogo.filter((ficha) => Array.isArray(ficha.grupos) && ficha.grupos.length > 0),
  'fichas con grupos',
);
const fichaSimple = primera(
  enOrdenDeCatalogo.filter((ficha) => ficha.tipo === 'simple'),
  'fichas simples',
);
const guia = primera(
  [...guias].sort((a, b) => a.titulo.localeCompare(b.titulo)),
  'guías',
);

export const muestras = {
  fichaConGrupos: { slug: fichaConGrupos.slug as string, datos: fichaConGrupos },
  fichaSimple: { slug: fichaSimple.slug as string, datos: fichaSimple },
  guia: { slug: guia.slug as string, datos: guia },
  fichas,
  guias,
};

export const paginasDeMuestra: string[] = [
  '/',
  '/productos/',
  `/productos/${muestras.fichaConGrupos.slug}/`,
  `/productos/${muestras.fichaSimple.slug}/`,
  '/promociones/',
  `/guias/${muestras.guia.slug}/`,
  '/contacto/',
];
