import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { main as mainMl } from '../../../scripts/generar-marca-ml.mjs';
import { main as mainRedes } from '../../../scripts/generar-marca-redes.mjs';
import { directorioTemporal } from './_generadores';
import { raiz } from './_marca';

const LIMITE_DE_PESO = 10 * 1024 * 1024;

const RASTERS: Record<string, [number, number]> = {
  'marca/mercadolibre/logo.png': [1000, 1000],
  'marca/mercadolibre/banner-escritorio.png': [3840, 200],
  'marca/mercadolibre/banner-movil.png': [1440, 320],
  'public/apple-touch-icon.png': [180, 180],
  'public/logo.png': [512, 512],
  'src/assets/images/logo.png': [512, 512],
  'marca/redes/avatar.png': [1080, 1080],
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((numero) => [`marca/redes/carrusel-presentacion-${numero}.png`, [1080, 1350] as [number, number]]),
  ),
};

const rutasDistintas = (a: string, b: string, rutas: string[]): string[] =>
  rutas.filter((ruta) => !readFileSync(path.join(a, ruta)).equals(readFileSync(path.join(b, ruta))));

const medir = async (ruta: string) => {
  const { width, height, format } = await sharp(path.join(raiz, ruta)).metadata();
  return { dimensiones: [width, height], formato: format, bytes: statSync(path.join(raiz, ruta)).size };
};

describe('[marca] Rasters de marca generados', () => {
  it('Dimensiones comprometidas', async () => {
    expect(Object.keys(RASTERS)).toHaveLength(13);
    for (const [ruta, esperadas] of Object.entries(RASTERS)) {
      const { dimensiones, formato, bytes } = await medir(ruta);
      expect(formato, ruta).toBe('png');
      expect(dimensiones, ruta).toEqual(esperadas);
      expect(bytes, ruta).toBeGreaterThan(0);
      expect(bytes, ruta).toBeLessThan(LIMITE_DE_PESO);
    }
  });

  it('la medición lee las dimensiones y el peso reales y falla ante un archivo ausente', async () => {
    const { dimensiones, bytes } = await medir('public/apple-touch-icon.png');
    expect(dimensiones).not.toEqual(RASTERS['public/logo.png']);
    expect(dimensiones).toEqual([180, 180]);
    expect(bytes).toBe(statSync(path.join(raiz, 'public/apple-touch-icon.png')).size);
    await expect(medir('marca/redes/no-existe.png')).rejects.toThrow();
  });

  it('Determinismo', async () => {
    const rutas = Object.keys(RASTERS);
    const corridas: string[] = [];
    for (let numero = 0; numero < 2; numero++) {
      const salida = directorioTemporal('determinismo');
      await mainMl({ salida });
      await mainRedes({ salida });
      corridas.push(salida);
    }
    for (const salida of corridas) {
      for (const ruta of rutas) expect(existsSync(path.join(salida, ruta)), `${ruta} en ${salida}`).toBe(true);
    }
    expect(rutasDistintas(corridas[0], corridas[1], rutas)).toEqual([]);
  }, 180000);

  it('la comparación de bytes señala los archivos que difieren', () => {
    const a = directorioTemporal('comparacion');
    const b = directorioTemporal('comparacion');
    writeFileSync(path.join(a, 'igual.png'), Buffer.from([1, 2, 3]));
    writeFileSync(path.join(b, 'igual.png'), Buffer.from([1, 2, 3]));
    writeFileSync(path.join(a, 'distinto.png'), Buffer.from([1, 2, 3]));
    writeFileSync(path.join(b, 'distinto.png'), Buffer.from([1, 2, 4]));
    expect(rutasDistintas(a, b, ['igual.png', 'distinto.png'])).toEqual(['distinto.png']);
  });
});
