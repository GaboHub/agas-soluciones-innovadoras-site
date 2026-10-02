import path from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { raiz } from './_marca';

const LADO = 1080;
const RADIO = 540;
const UMBRAL_DE_LUMINANCIA = 140;

interface Raster {
  data: Uint8Array;
  ancho: number;
  alto: number;
  canales: number;
}

const luminanciaEn = ({ data, ancho, canales }: Raster, x: number, y: number): number => {
  const inicio = (y * ancho + x) * canales;
  return 0.2126 * data[inicio] + 0.7152 * data[inicio + 1] + 0.0722 * data[inicio + 2];
};

const clarosSegunElCirculo = (raster: Raster, radio: number): { dentro: number; fuera: number } => {
  const centroX = raster.ancho / 2;
  const centroY = raster.alto / 2;
  let dentro = 0;
  let fuera = 0;
  for (let y = 0; y < raster.alto; y++) {
    for (let x = 0; x < raster.ancho; x++) {
      if (luminanciaEn(raster, x, y) <= UMBRAL_DE_LUMINANCIA) continue;
      const distancia = Math.hypot(x + 0.5 - centroX, y + 0.5 - centroY);
      if (distancia > radio) fuera++;
      else dentro++;
    }
  }
  return { dentro, fuera };
};

const rasterSintetico = (ancho: number, alto: number, claros: [number, number][]): Raster => {
  const data = new Uint8Array(ancho * alto * 4);
  for (const [x, y] of claros) data.set([255, 255, 255, 255], (y * ancho + x) * 4);
  return { data, ancho, alto, canales: 4 };
};

describe('[marca] Avatar sin baldosa', () => {
  it('Monograma dentro del círculo', async () => {
    const { data, info } = await sharp(path.join(raiz, 'marca/redes/avatar.png')).raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([LADO, LADO]);
    const { dentro, fuera } = clarosSegunElCirculo(
      { data, ancho: info.width, alto: info.height, canales: info.channels },
      RADIO,
    );
    expect(dentro).toBeGreaterThan(0);
    expect(fuera).toBe(0);
  });

  it('el detector cuenta los claros fuera del círculo y los de dentro por separado', () => {
    const raster = rasterSintetico(20, 20, [
      [10, 10],
      [11, 9],
      [0, 0],
      [19, 19],
    ]);
    expect(clarosSegunElCirculo(raster, 10)).toEqual({ dentro: 2, fuera: 2 });
    expect(clarosSegunElCirculo(rasterSintetico(20, 20, [[10, 10]]), 10)).toEqual({ dentro: 1, fuera: 0 });
  });
});
