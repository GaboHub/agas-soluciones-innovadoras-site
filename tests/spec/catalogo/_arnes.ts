import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import matter from 'gray-matter';
import { vi } from 'vitest';
import { main } from '../../../scripts/generar-catalogo.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ_REPO = path.resolve(aqui, '../../..');
export const FIXTURE_BARRIDO = path.join(RAIZ_REPO, 'tests/fixtures/barrido');

export const SLUG_MAP_FIXTURE = [
  { prefijo: 'MLC1001', slug: 'lamina-fixture', titulo: 'Lámina Titulada Fixture Switch' },
  { prefijo: 'MLC1002', slug: 'estuche-variantes', titulo: 'Estuche Fixture Switch Variantes' },
  { prefijo: 'MLC1003', slug: 'lamina-catalogo', titulo: 'Lámina Catálogo Fixture Switch' },
  { prefijo: 'MLC1006', slug: 'lamina-activa', titulo: 'Lámina Activa Fixture Switch' },
  { prefijo: 'MLC1007', slug: 'gemela-uno', titulo: 'Gemela Uno Fixture Switch' },
  { prefijo: 'MLC1008', slug: 'gemela-dos', titulo: 'Gemela Dos Fixture Switch' },
  {
    prefijo: 'familia-audifonos-fixture',
    slug: 'audifonos-fixture',
    titulo: 'Audífonos Fixture Inalámbricos',
    coloresMiembros: { MLC2001: 'Azul Mapeado' },
  },
  {
    prefijo: 'familia-kit-fundas-fixture',
    slug: 'kit-fundas-fixture',
    titulo: 'Kit Fundas Fixture Diseños Control PS5',
    agruparPorDiseno: true,
  },
  { prefijo: 'familia-sin-activos', slug: 'familia-vacia', titulo: 'Familia Vacía Fixture' },
  { prefijo: 'MLC1013', slug: 'sin-datos', titulo: 'Sin Datos Fixture Switch' },
  { prefijo: 'MLC1014', slug: 'precio-original', titulo: 'Precio Original Fixture Switch' },
  { prefijo: 'familia-replicada-fixture', slug: 'replicada-fixture', titulo: 'Replicada Fixture Switch' },
  { prefijo: 'MLC1015', slug: 'descripcion-rica', titulo: 'Descripción Rica Fixture Switch' },
  { prefijo: 'MLC1016', slug: 'nueve-imagenes', titulo: 'Nueve Imágenes Fixture Switch' },
  { prefijo: 'MLC1017', slug: 'dimensiones', titulo: 'Dimensiones Fixture Switch' },
  { prefijo: 'MLC1018', slug: 'imagen-faltante', titulo: 'Imagen Faltante Fixture Switch' },
  { prefijo: 'MLC1019', slug: 'tres-cinco', titulo: 'Tres Cinco Fixture Switch' },
  { prefijo: 'MLC9', slug: 'no-existe', titulo: 'No Existe' },
];

const colorDeImagen = (ruta: string) => {
  const byte = createHash('sha1').update(ruta).digest()[0];
  return { r: byte, g: 255 - byte, b: 128 };
};

const dimensionesDe = (ruta: string) => {
  const coincidencia = path.basename(ruta).match(/(\d+)x(\d+)/);
  return coincidencia ? { width: Number(coincidencia[1]), height: Number(coincidencia[2]) } : null;
};

const rutasDeImagenes = (carpetaPublicacion: string) =>
  [...readFileSync(path.join(carpetaPublicacion, 'publicacion.md'), 'utf-8').matchAll(/^- (\S+\.jpg)$/gm)].map(
    (coincidencia) => coincidencia[1],
  );

export async function crearContexto(): Promise<string> {
  const destino = mkdtempSync(path.join(tmpdir(), 'barrido-'));
  cpSync(FIXTURE_BARRIDO, destino, { recursive: true });
  const publicaciones = path.join(destino, 'publicaciones');
  for (const carpeta of readdirSync(publicaciones)) {
    const base = path.join(publicaciones, carpeta);
    for (const relativa of rutasDeImagenes(base)) {
      if (path.basename(relativa).includes('faltante')) continue;
      const ruta = path.join(base, relativa);
      mkdirSync(path.dirname(ruta), { recursive: true });
      const medidas = dimensionesDe(relativa);
      const fuente = medidas
        ? { create: { ...medidas, channels: 3 as const, background: { r: 128, g: 128, b: 128 }, noise: { type: 'gaussian' as const, mean: 128, sigma: 40 } } }
        : { create: { width: 24, height: 16, channels: 3 as const, background: colorDeImagen(relativa) } };
      await sharp(fuente).jpeg().toFile(ruta);
    }
  }
  return destino;
}

export function crearRaizCurada(): string {
  const raiz = mkdtempSync(path.join(tmpdir(), 'raiz-'));
  const escribir = (relativa: string, contenido: string) => {
    const ruta = path.join(raiz, relativa);
    mkdirSync(path.dirname(ruta), { recursive: true });
    writeFileSync(ruta, contenido);
  };
  escribir('content/guias/guia.md', '---\ntitulo: Guía curada\n---\ncuerpo\n');
  escribir('content/paginas/pagina.md', '---\ntitulo: Página curada\n---\ncuerpo\n');
  escribir('public/robots.txt', 'User-agent: *\n');
  escribir('src/data/site.json', '{"nombre":"curado"}\n');
  escribir('src/data/promociones.json', '{"aclaracion":"curada","cupones":[],"campanas":[],"faqs":[]}\n');
  escribir('src/data/faqs.json', '[]\n');
  escribir('src/data/textos-productos.json', '{}\n');
  escribir('src/data/resenas.json', '{"antiguo":true}\n');
  escribir('content/productos/huerfano.md', '---\ntitulo: Huérfano\n---\n');
  escribir('src/assets/images/productos/huerfano/01.webp', 'imagen huérfana');
  return raiz;
}

export type Corrida = { avisos: string[]; mensajes: string[] };

export async function generar(opciones: { contexto: string; raiz: string; slugMap?: unknown[] }): Promise<Corrida> {
  const avisos: string[] = [];
  const mensajes: string[] = [];
  const advertir = vi.spyOn(console, 'warn').mockImplementation((...partes: unknown[]) => {
    avisos.push(partes.join(' '));
  });
  const informar = vi.spyOn(console, 'log').mockImplementation((...partes: unknown[]) => {
    mensajes.push(partes.join(' '));
  });
  try {
    await main({ slugMap: SLUG_MAP_FIXTURE, ...opciones });
  } finally {
    advertir.mockRestore();
    informar.mockRestore();
  }
  return { avisos, mensajes };
}

export const leerFicha = (raiz: string, slug: string) =>
  matter(readFileSync(path.join(raiz, 'content/productos', `${slug}.md`), 'utf-8'));

export const slugsGenerados = (raiz: string) =>
  readdirSync(path.join(raiz, 'content/productos'))
    .filter((archivo) => archivo.endsWith('.md'))
    .map((archivo) => archivo.replace(/\.md$/, ''))
    .sort();

export const existe = (raiz: string, relativa: string) => existsSync(path.join(raiz, relativa));

export function hashDeArbol(directorio: string, excluir: string[] = []): string {
  const hash = createHash('sha256');
  const recorrer = (actual: string) => {
    for (const entrada of readdirSync(actual, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const ruta = path.join(actual, entrada.name);
      const relativa = path.relative(directorio, ruta).split(path.sep).join('/');
      if (excluir.some((prefijo) => relativa === prefijo || relativa.startsWith(`${prefijo}/`))) continue;
      hash.update(`${entrada.isDirectory() ? 'd' : 'f'}:${relativa}\n`);
      if (entrada.isDirectory()) recorrer(ruta);
      else hash.update(readFileSync(ruta));
    }
  };
  recorrer(directorio);
  return hash.digest('hex');
}

export const borrar = (...rutas: string[]) => {
  for (const ruta of rutas) rmSync(ruta, { recursive: true, force: true });
};

export const permalinkDeFixture = (carpeta: string, tipo: 'suelta' | 'miembro' = 'suelta', item?: string) => {
  const texto = readFileSync(path.join(FIXTURE_BARRIDO, 'publicaciones', carpeta, 'publicacion.md'), 'utf-8');
  const patron = tipo === 'miembro' ? new RegExp(`\\*\\*ML Item ID:\\*\\* ${item}\\n- \\*\\*Link:\\*\\* (\\S+)`) : /\*\*Link:\*\* (\S+)/;
  const coincidencia = texto.match(patron);
  if (!coincidencia) throw new Error(`Sin link en ${carpeta}`);
  return coincidencia[1];
};

export async function generarAparte(slugMap: unknown[], contexto: string) {
  const raiz = crearRaizCurada();
  try {
    const { avisos } = await generar({ contexto, raiz, slugMap });
    const slugs = slugsGenerados(raiz);
    const fichas = Object.fromEntries(slugs.map((slug) => [slug, leerFicha(raiz, slug)]));
    return { avisos, slugs, ficha: (slug: string) => fichas[slug] };
  } finally {
    borrar(raiz);
  }
}

export const imagenesDeclaradasDeMiembro = (carpeta: string, item: string): string[] => {
  const texto = readFileSync(path.join(FIXTURE_BARRIDO, 'publicaciones', carpeta, 'publicacion.md'), 'utf-8');
  const seccion = texto.split(/^## /m).find((bloque) => bloque.includes(`**ML Item ID:** ${item}\n`));
  if (!seccion) throw new Error(`Sin miembro ${item} en ${carpeta}`);
  return [...seccion.matchAll(/^- (\S+\.jpg)$/gm)].map((coincidencia) => coincidencia[1]);
};

export const itemDeLink = (link: string): string => {
  const coincidencia = link.match(/MLC-(\d+)/);
  if (!coincidencia) throw new Error(`Link sin item: ${link}`);
  return `MLC${coincidencia[1]}`;
};

export async function comprobarImagenesDeMiembro(opciones: {
  contexto: string;
  raiz: string;
  carpeta: string;
  link: string;
  imagenes: string[];
}) {
  const declaradas = imagenesDeclaradasDeMiembro(opciones.carpeta, itemDeLink(opciones.link));
  const generadas = opciones.imagenes.map((imagen) => readFileSync(path.join(opciones.raiz, 'src/assets/images', imagen)));
  const esperadas = await Promise.all(
    declaradas.map((relativa) =>
      sharp(path.join(opciones.contexto, 'publicaciones', opciones.carpeta, relativa))
        .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
    ),
  );
  return { declaradas, generadas, esperadas };
}
