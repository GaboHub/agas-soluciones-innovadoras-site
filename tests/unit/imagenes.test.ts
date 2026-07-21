import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.resolve(dirname, '../../src/assets/images');
const productosDir = path.resolve(dirname, '../../content/productos');
const publicDir = path.resolve(dirname, '../../public');

const archivos = readdirSync(productosDir).filter((archivo) => archivo.endsWith('.md'));

interface ConImagenes {
  imagenes?: string[];
}

function rutasDeImagenes(data: Record<string, unknown>): string[] {
  const rutas: string[] = [...((data.imagenes as string[]) ?? [])];
  for (const variante of (data.variantes as ConImagenes[]) ?? []) {
    rutas.push(...(variante.imagenes ?? []));
  }
  for (const miembro of (data.miembros as ConImagenes[]) ?? []) {
    rutas.push(...(miembro.imagenes ?? []));
  }
  for (const grupo of (data.grupos as { colores: ConImagenes[] }[]) ?? []) {
    for (const color of grupo.colores) {
      rutas.push(...(color.imagenes ?? []));
    }
  }
  return rutas;
}

describe('imágenes de productos', () => {
  it.each(archivos)('todas las imágenes referenciadas en %s existen en disco', (archivo) => {
    const { data } = matter(readFileSync(path.join(productosDir, archivo), 'utf-8'));
    const rutas = rutasDeImagenes(data);
    expect(rutas.length).toBeGreaterThan(0);
    const faltantes = rutas.filter((ruta) => !existsSync(path.join(imagesDir, ruta)));
    expect(faltantes).toEqual([]);
  });
});

describe('logos', () => {
  it.each(['agas-lockup.svg', 'agas-lockup-blanco.svg', 'logo.png'])(
    'existe src/assets/images/%s',
    (nombre) => {
      expect(existsSync(path.join(imagesDir, nombre))).toBe(true);
    },
  );

  it.each(['favicon.svg', 'logo.png'])('existe public/%s', (nombre) => {
    expect(existsSync(path.join(publicDir, nombre))).toBe(true);
  });

  it('no quedan placeholders de la plantilla en assets', () => {
    const nombres = readdirSync(imagesDir);
    expect(nombres.some((nombre) => nombre.startsWith('servicio-'))).toBe(false);
    expect(nombres.some((nombre) => nombre.startsWith('galeria-'))).toBe(false);
  });
});
