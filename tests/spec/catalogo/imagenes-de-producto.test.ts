import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { borrar, crearContexto, crearRaizCurada, generar, leerFicha, SLUG_MAP_FIXTURE, slugsGenerados, type Corrida } from './_arnes';

let contexto: string;
let raiz: string;
let corrida: Corrida;

beforeAll(async () => {
  contexto = await crearContexto();
  raiz = crearRaizCurada();
  corrida = await generar({ contexto, raiz });
});

afterAll(() => {
  borrar(contexto, raiz);
});

const dirImagenes = () => path.join(raiz, 'src/assets/images');
const archivosDe = (relativa: string) => readdirSync(path.join(dirImagenes(), relativa)).sort();

const rutasDeFicha = (datos: Record<string, any>): string[] => [
  ...(datos.imagenes ?? []),
  ...(datos.variantes ?? []).flatMap((variante: { imagenes: string[] }) => variante.imagenes),
  ...(datos.miembros ?? []).flatMap((miembro: { imagenes: string[] }) => miembro.imagenes),
  ...(datos.grupos ?? []).flatMap((grupo: { colores: { imagenes: string[] }[] }) =>
    grupo.colores.flatMap((color) => color.imagenes),
  ),
];

const FUENTES = 9;

const ampliarFuentes = async (contextoDestino: string, carpeta: string, ancla: string, prefijo: string) => {
  const publicacion = path.join(contextoDestino, 'publicaciones', carpeta, 'publicacion.md');
  const texto = readFileSync(publicacion, 'utf-8');
  const inicio = texto.indexOf(ancla);
  expect(inicio, ancla).toBeGreaterThanOrEqual(0);
  const lineas = [...texto.slice(inicio).matchAll(new RegExp(`^- (${prefijo}/imagenes/\\S+\\.jpg)$`, 'gm'))];
  expect(lineas.length, ancla).toBeGreaterThanOrEqual(2);
  const nuevas = Array.from({ length: FUENTES }, (_, indice) => `${prefijo}/imagenes/0${indice + 1}-${indice + 1}00-nueva_${indice + 1}.jpg`);
  const primera = lineas[0];
  const ultima = lineas[lineas.length - 1];
  const desde = inicio + primera.index!;
  const hasta = inicio + ultima.index! + ultima[0].length;
  writeFileSync(publicacion, `${texto.slice(0, desde)}${nuevas.map((ruta) => `- ${ruta}`).join('\n')}${texto.slice(hasta)}`);
  for (const [indice, relativa] of nuevas.entries()) {
    const ruta = path.join(contextoDestino, 'publicaciones', carpeta, relativa);
    mkdirSync(path.dirname(ruta), { recursive: true });
    await sharp({ create: { width: 30 + indice, height: 20, channels: 3, background: { r: 20 * indice, g: 90, b: 160 } } }).jpeg().toFile(ruta);
  }
};

describe('[catalogo] Imágenes de producto', () => {
  it('Más de siete imágenes', () => {
    expect(archivosDe('productos/nueve-imagenes')).toEqual(['01.webp', '02.webp', '03.webp', '04.webp', '05.webp', '06.webp', '07.webp']);
    expect(leerFicha(raiz, 'nueve-imagenes').data.imagenes).toHaveLength(7);
  });

  it('Más de siete imágenes en una variante y en un miembro de cada tipo de familia', async () => {
    const otro = await crearContexto();
    const raizOtra = crearRaizCurada();
    try {
      await ampliarFuentes(otro, 'MLC1002-estuche-variantes', '**Color: Rojo**', 'variante-color-rojo-123');
      await ampliarFuentes(otro, 'familia-audifonos-fixture', '**ML Item ID:** MLC2001', 'MLC2001-miembro');
      await ampliarFuentes(otro, 'familia-kit-fundas-fixture', '**ML Item ID:** MLC3001', 'MLC3001-miembro');
      const prefijos = ['MLC1002', 'familia-audifonos-fixture', 'familia-kit-fundas-fixture'];
      await generar({ contexto: otro, raiz: raizOtra, slugMap: SLUG_MAP_FIXTURE.filter((entrada) => prefijos.includes(entrada.prefijo)) });
      const siete = ['01.webp', '02.webp', '03.webp', '04.webp', '05.webp', '06.webp', '07.webp'];
      const imagenes = (relativa: string) => readdirSync(path.join(raizOtra, 'src/assets/images', relativa)).sort();

      const variante = (leerFicha(raizOtra, 'estuche-variantes').data.variantes as { imagenes: string[] }[])[0];
      expect(imagenes('productos/estuche-variantes/rojo')).toEqual(siete);
      expect(variante.imagenes).toEqual(siete.map((archivo) => `productos/estuche-variantes/rojo/${archivo}`));

      const miembro = (leerFicha(raizOtra, 'audifonos-fixture').data.miembros as { imagenes: string[] }[]).find((candidato) =>
        candidato.imagenes[0].includes('MLC2001'),
      )!;
      expect(imagenes('productos/audifonos-fixture/MLC2001')).toEqual(siete);
      expect(miembro.imagenes).toEqual(siete.map((archivo) => `productos/audifonos-fixture/MLC2001/${archivo}`));

      const color = (leerFicha(raizOtra, 'kit-fundas-fixture').data.grupos as { colores: { imagenes: string[] }[] }[])
        .flatMap((grupo) => grupo.colores)
        .find((candidato) => candidato.imagenes[0].includes('MLC3001'))!;
      expect(imagenes('productos/kit-fundas-fixture/MLC3001')).toEqual(siete);
      expect(color.imagenes).toEqual(siete.map((archivo) => `productos/kit-fundas-fixture/MLC3001/${archivo}`));
    } finally {
      borrar(otro, raizOtra);
    }
  });

  it('Sin agrandar', async () => {
    const grande = await sharp(path.join(dirImagenes(), 'productos/dimensiones/01.webp')).metadata();
    const chica = await sharp(path.join(dirImagenes(), 'productos/dimensiones/02.webp')).metadata();
    expect([grande.width, grande.height, grande.format]).toEqual([800, 600, 'webp']);
    expect([chica.width, chica.height, chica.format]).toEqual([400, 300, 'webp']);
  });

  it('calidad WebP 80', async () => {
    const fuente = path.join(contexto, 'publicaciones/MLC1017-dimensiones/imagenes/01-1600x1200-MLC1017_1.jpg');
    const esperado = await sharp(fuente).resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    expect(readFileSync(path.join(dirImagenes(), 'productos/dimensiones/01.webp')).equals(esperado)).toBe(true);
  });

  it('Imagen faltante', () => {
    expect(archivosDe('productos/imagen-faltante')).toEqual(['01.webp', '02.webp']);
    expect(leerFicha(raiz, 'imagen-faltante').data.imagenes).toEqual([
      'productos/imagen-faltante/01.webp',
      'productos/imagen-faltante/02.webp',
    ]);
    expect(corrida.avisos.some((aviso) => aviso.includes('Imagen no encontrada, se omite') && aviso.includes('faltante'))).toBe(true);
  });

  it('se nombran por producto, variante o miembro', () => {
    expect(leerFicha(raiz, 'lamina-fixture').data.imagenes).toEqual([
      'productos/lamina-fixture/01.webp',
      'productos/lamina-fixture/02.webp',
    ]);
    const variantes = leerFicha(raiz, 'estuche-variantes').data.variantes as { imagenes: string[] }[];
    expect(variantes[0].imagenes).toEqual([
      'productos/estuche-variantes/rojo/01.webp',
      'productos/estuche-variantes/rojo/02.webp',
    ]);
    const miembros = leerFicha(raiz, 'audifonos-fixture').data.miembros as { imagenes: string[] }[];
    expect(miembros[0].imagenes).toEqual([
      'productos/audifonos-fixture/MLC2001/01.webp',
      'productos/audifonos-fixture/MLC2001/02.webp',
    ]);
  });

  it('toda ruta referenciada por una ficha existe', () => {
    for (const slug of slugsGenerados(raiz)) {
      const rutas = rutasDeFicha(leerFicha(raiz, slug).data);
      for (const ruta of rutas) expect(existsSync(path.join(dirImagenes(), ruta)), `${slug}: ${ruta}`).toBe(true);
    }
  });
});
